# Meta Ads Platform API — implementación en Go

Reimplementación del microservicio (`apps/api`, FastAPI/Python) en **Go**,
pensada como material de estudio. Conserva la **arquitectura hexagonal (Ports &
Adapters)** y la traduce a idiomática Go, con varios patrones de diseño
señalados y comentados en el código.

> Solo usa la **librería estándar** (`net/http`, `log/slog`, `sync`, `context`…).
> Sin dependencias externas → `go build` funciona sin descargar nada.

## Correr

```bash
cd apps/api-go

go run ./cmd/api          # arranca en :8080 en modo stub (sin servicios externos)
curl localhost:8080/health

go test ./...             # tests
go test -race ./...       # tests + detector de data races
go vet ./...              # análisis estático
```

Variables de entorno (todas con default para modo stub): `USE_STUBS`, `ADDR`,
`BASE_URL`, `ENVIRONMENT`, `DATABASE_URL`, `REDIS_URL`, `META_SYSTEM_USER_TOKEN`,
`ANTHROPIC_API_KEY`.

## Estructura y capas

```
apps/api-go/
├── cmd/api/main.go                     # entrypoint: config → container → server
└── internal/
    ├── domain/                         # NÚCLEO — sin dependencias externas
    │   ├── model/                      # entidades puras (+ CampaignBuilder, errores)
    │   ├── port/                        # interfaces (los "ports")
    │   └── usecase/                     # lógica de negocio (depende solo de ports)
    ├── application/                     # servicios que orquestan use cases
    ├── adapter/
    │   ├── inbound/http/                # adapter HTTP (router, handlers, middleware)
    │   └── outbound/stub/               # implementaciones stub de TODOS los ports
    ├── infrastructure/container.go      # composition root (factory stub vs. real)
    └── config/                          # settings desde env
```

### La regla de dependencias (idéntica a la versión Python)

```
adapter/inbound (http) → application → domain/usecase → domain/port (interfaces)
                                                              ▲
                                  adapter/outbound implementa los ports
```

`domain/` no importa nada de `adapter`, `application` ni `infrastructure`. Las
dependencias siempre apuntan hacia adentro. Verificable:

```bash
go list -deps ./internal/domain/usecase | grep -E 'adapter|application|infrastructure'
# (sin salida = la regla se cumple)
```

### Mapeo Python ⇄ Go

| Python (FastAPI)                | Go                                   |
|---|---|
| `IAdPlatform(ABC)`              | `port.AdPlatform` (interfaz, sin prefijo `I`) |
| clase con `@abstractmethod`     | interfaz satisfecha **implícitamente** |
| `CreateCampaignUseCase`         | `usecase.CreateCampaignUseCase` + constructor |
| inyección por `__init__`        | inyección por constructor (`New…`) |
| `Container` (pydantic DI)       | `infrastructure.Container` (factory a mano) |
| routers FastAPI + `Depends`     | `net/http` ServeMux (`"GET /path/{id}"`) |
| `BackgroundTasks`               | `go func(){ … }()` con `context.Background()` |
| `asyncio.gather`                | goroutines + `sync.WaitGroup` |
| excepciones                     | `error` + `errors.Is` sobre sentinels |

## Patrones de diseño en el código (para estudiar)

> Catálogo completo con rutas exactas (Go + Angular): [`../../docs/patterns.md`](../../docs/patterns.md).

- **Ports & Adapters (Hexagonal)** — `domain/port` define interfaces; los
  adapters (`adapter/outbound/stub`) las implementan; los use cases dependen solo
  de las interfaces. Es la forma de la *Strategy* a escala de arquitectura.
- **Builder** — `model.CampaignBuilder` (ensambla el agregado `Campaign` con API
  fluida y valida en `Build()`) y `stub.AdPromptBuilder` (arma el prompt de
  imagen por fragmentos). Ver `internal/domain/model/campaign_builder.go`.
- **Functional Options** — `httpadapter.New(addr, h, WithReadTimeout(…), …)`:
  configuración opcional y extensible sin romper llamadas existentes. Ver
  `internal/adapter/inbound/http/server.go`.
- **Factory / Composition Root** — `infrastructure.Container` decide qué
  implementación concreta cumple cada port (stub hoy, real cuando `UseStubs` sea
  false). Único lugar que conoce los tipos concretos.
- **Decorator / Middleware** — `withLogging`, `withRecover`: `func(http.Handler)
  http.Handler` componibles. Ver `internal/adapter/inbound/http/middleware.go`.
- **Constructor injection** — sin contenedor mágico: cada `New…` recibe sus
  dependencias como interfaces.

## Concurrencia (puntos clave de Go)

- El pipeline de inspiración corre imágenes y copies **en paralelo** con dos
  goroutines y un `sync.WaitGroup` (`usecase/generate_inspiration.go`). Cada
  goroutine escribe en variables propias → sin necesidad de mutex.
- Los stores en memoria se comparten entre requests (cada request es una
  goroutine), así que protegen sus mapas con `sync.RWMutex`
  (`adapter/outbound/stub/repository.go`). El test corre con `-race` para
  garantizar que no hay data races.
- El trabajo pesado se lanza en background con `context.Background()`, **no** con
  el contexto del request (que se cancela al responder).

## Workers y colas (modelo multi-proceso, como `arq`)

El trabajo pesado (el pipeline de inspiración) se ejecuta **fuera del request**.
Hay dos drivers, seleccionados por `QUEUE_DRIVER`, detrás del mismo port
`application.Enqueuer` — el handler HTTP no cambia entre uno y otro:

| `QUEUE_DRIVER` | Cómo corre | Job store | Equivale en Python a |
|---|---|---|---|
| `inprocess` (default) | goroutine en el proceso del API | en memoria | `BackgroundTasks` |
| `asynq` | tarea en Redis que consume un proceso `cmd/worker` aparte | Redis (compartido) | `arq` + Redis worker |

Flujo en modo `asynq`:

```
POST /inspiration/search
   → InspirationService.Start  (persiste job "pending" en Redis)
   → Enqueuer.EnqueueInspiration  → asynq.Client → Redis (cola)
   ⇢ 202 Accepted  (responde ya)
                        Redis (cola)
                           ↓ pull
   cmd/worker  → asynq.Server (pool de N goroutines) → InspirationService.RunCommand
              → escribe el job "ready" en el MISMO job store de Redis
GET /inspiration/{jobId}  (polling)  → el API lee el estado desde Redis
```

Piezas en el código:

- **Port**: `application.Enqueuer` (`internal/application/enqueuer.go`).
- **Adapters outbound**: `queue.InProcess` (goroutine) y `queue.AsynqEnqueuer`
  (Redis) en `internal/adapter/outbound/queue/`.
- **Adapter inbound (worker)**: `worker.InspirationWorker`
  (`internal/adapter/inbound/worker/`), registrado en `cmd/worker`.
- **Estado compartido**: `redisstore.JobStore`
  (`internal/adapter/outbound/redisstore/`) para que API y worker se vean.

> El **dominio y los use cases no cambian** entre `inprocess` y `asynq`: cambiar
> de una goroutine a una cola distribuida es una línea en el `Container`. Ese es
> el beneficio de tener `Enqueuer` como port.

Correrlo de verdad (necesita Redis):

```bash
# 1. Redis
redis-server --port 6379 &

# 2. Worker (proceso aparte)
QUEUE_DRIVER=asynq REDIS_ADDR=127.0.0.1:6379 go run ./cmd/worker

# 3. API en modo cola
QUEUE_DRIVER=asynq REDIS_ADDR=127.0.0.1:6379 go run ./cmd/api

# o todo junto:
docker compose up --build
```

`asynq.Config{Concurrency: N}` en `cmd/worker` es el análogo de `max_jobs` de
arq; `asynq.MaxRetry(3)` al encolar, el análogo de los reintentos.

## Endpoints

Mismos que la versión Python (compatibles con el frontend Next.js):
`GET /health`, `GET /clients`, `GET /clients/{id}`, `GET|POST /campaigns`,
`POST /campaigns/publish-from-job`, `GET /campaigns/{id}`,
`PATCH /campaigns/{id}/status`, `GET /campaigns/{id}/insights`,
`DELETE /campaigns/{id}`, `POST /inspiration/search`, `GET /inspiration/{jobId}`,
`POST /webhooks/higgsfield/{jobId}`.
