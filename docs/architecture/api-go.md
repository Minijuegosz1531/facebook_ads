# `apps/api-go` — Go 1.24 · solo stdlib

Reimplementación de la API en Go usando exclusivamente la librería estándar
(`net/http` con routing por método de Go 1.22+). Pensada como material de
estudio: la misma arquitectura hexagonal de `apps/api`, idiomática en Go.

Para los patrones concretos del código y dónde están, ver
[`../patterns.md`](../patterns.md). Para la teoría compartida,
[`README.md`](README.md).

---

## Stack

| Pieza | Tecnología |
|---|---|
| Runtime | Go 1.24 |
| HTTP | `net/http` (Go 1.22+ method routing `"GET /campaigns/{id}"`) |
| Logging | `log/slog` (structured, stdlib) |
| Cola | `github.com/hibiken/asynq` 0.25 + Redis |
| Job store compartido (modo asynq) | `github.com/redis/go-redis/v9` |
| Tests | `testing` stdlib + `httptest` + `go test -race` |

> Las únicas dependencias externas son `asynq` y `go-redis`, y SOLO se cargan
> en el modo multi-proceso (`QUEUE_DRIVER=asynq`). En el modo default
> (`inprocess`), el binario es 100% stdlib.

---

## Layout

```
apps/api-go/
├── cmd/
│   ├── api/main.go                  # entrypoint del HTTP server
│   └── worker/main.go               # entrypoint del worker asynq
└── internal/
    ├── domain/                      # NÚCLEO sin deps externas
    │   ├── model/                   # entidades + CampaignBuilder + errors
    │   ├── port/                    # interfaces (los "ports")
    │   └── usecase/                 # lógica de negocio
    ├── application/                 # services que orquestan use cases
    ├── adapter/
    │   ├── inbound/
    │   │   ├── http/                # ServeMux, handlers, middleware, DTOs
    │   │   └── worker/              # asynq task handlers
    │   └── outbound/
    │       ├── stub/                # in-memory + fakes
    │       ├── queue/               # asynq enqueuer + in-process queue
    │       └── redisstore/          # Redis job store
    ├── infrastructure/container.go  # composition root
    └── config/config.go             # config desde env
```

---

## Capa por capa

### 1. Dominio — `internal/domain/`

**Qué contiene:**
- `model/`: structs Go puras (`Campaign`, `Client`, `InspirationJob`) + el `CampaignBuilder` + las sentinelas (`ErrNotFound`, `ErrValidation`, …).
- `port/outbound.go`: interfaces Go puras (`AdPlatform`, `CampaignRepository`, …). Un solo archivo para todo el directorio: los ports son pocos y se leen juntos.
- `usecase/`: una estructura por intención con `New…` constructor + `Execute(ctx, cmd)`. Inyección por constructor.

**Qué NO contiene:**
- Imports de `net/http`, `database/sql`, SDKs ni asynq.

**Idiomas Go aplicados:**
- **Interfaces sin prefijo `I`** — convención Go: `AdPlatform`, no `IAdPlatform`. Verificable mecánicamente con `go list -deps ./internal/domain/...`: no debe aparecer ningún path de `internal/adapter|application|infrastructure`.
- **Interfaces satisfechas implícitamente** — un adapter "implementa" un port simplemente teniendo el method set. No hay `implements`. El compilador rechaza la asignación si falla.
- **`context.Context` en TODOS los métodos** — la cancelación y los deadlines se propagan limpiamente, y un test puede cancelar a voluntad.
- **Sentinel errors + `errors.Is`** — el use case envuelve con `fmt.Errorf("…: %w", model.ErrNotFound)`. El handler HTTP mapea con `errors.Is(err, model.ErrNotFound)` a 404.
- **Builder fluido** (`CampaignBuilder`) con validación en `Build()` — devuelve `(Campaign, error)`, nunca panic.

**Por qué la dirección de dependencias se puede verificar con `go list`:**

```bash
go list -deps ./internal/domain/... | grep -E 'internal/(adapter|application|infrastructure)'
# cualquier salida = violación
```

Es la regla hexagonal automatizada por la propia herramienta del lenguaje.

---

### 2. Aplicación — `internal/application/`

**`campaign_service.go`** y **`inspiration_service.go`**: structs que construyen sus use cases en `NewCampaignService` y exponen métodos delegados. El service tiene el método público; el use case tiene la lógica.

`CampaignService.publishFromJob` es el ejemplo de composición: arma el `SelectAssetsAndPublishUseCase` con el `CreateCampaignUseCase` interno, sin que el handler conozca esa orquestación.

---

### 3. Adapters inbound — `internal/adapter/inbound/`

#### HTTP — `internal/adapter/inbound/http/`

- **`server.go`**: wrapper sobre `*http.Server` con **Functional Options**
  (`WithReadTimeout`, `WithWriteTimeout`, `WithIdleTimeout`). Permite que `main`
  añada opciones futuras sin romper la firma.
- **`handler.go`**: arma un `*http.ServeMux` con patterns `"GET /campaigns/{id}"`.
  Go 1.22 trae routing por método sin necesidad de gorilla/chi.
- **`middleware.go`**: `withLogging`, `withRecover`. Decoradores `func(http.Handler) http.Handler` componibles.
- **`*_handler.go`**: handlers por recurso (campaigns, clients, inspiration, webhook).
- **`dto.go`**: response DTOs con `json:"snake_case"` tags y mappers `toCampaignResponse(...)`.
- **`respond.go`**: helpers `writeJSON` / `writeError` (mapea `errors.Is(...)` a status).

#### Workers — `internal/adapter/inbound/worker/`

**`inspiration_worker.go`** define el handler de asynq:

```go
func (w *InspirationWorker) HandleGenerate(ctx context.Context, t *asynq.Task) error {
    var cmd usecase.GenerateInspirationCommand
    json.Unmarshal(t.Payload(), &cmd)
    _, err := w.svc.RunCommand(ctx, cmd)
    return err  // asynq retries on error (bounded by MaxRetry)
}
```

Se registra en `cmd/worker/main.go` con `asynq.NewServer(...).Run(mux)`.
**Concurrency** del asynq Server es el equivalente a `max_jobs` de `arq`.

---

### 4. Adapters outbound — `internal/adapter/outbound/`

| Port | Stub | Real |
|---|---|---|
| `CampaignRepository` | `stub/repository.go::InMemoryCampaignRepository` | (Postgres futuro) |
| `ClientRepository` | `stub/repository.go::InMemoryClientRepository` | — |
| `JobStore` | `stub/repository.go::InMemoryJobStore` | `redisstore/job_store.go` |
| `AdPlatform` | `stub/ad_platform.go::AdPlatform` | (Meta CLI futuro vía `os/exec`) |
| `AdLibrary` | `stub/ad_library.go::AdLibrary` | — |
| `ImageGenerator` | `stub/image_generator.go::ImageGenerator` (+ `AdPromptBuilder`) | — |
| `CopyGenerator` | `stub/copy_generator.go::CopyGenerator` | — |
| `Storage` | `stub/storage.go::Storage` | — |
| Enqueuer (cola de inspiración) | `queue/inprocess.go::InProcess` (goroutine) | `queue/asynq_enqueuer.go::AsynqEnqueuer` (Redis) |

**Decisión clave 1 — `sync.RWMutex` en los stubs:** cada request HTTP corre en
su propia goroutine y comparten el mismo store. Sin mutex, leer/escribir el map
es un data race que crashea el proceso. El test corre con `-race` para garantizar
que no hay.

**Decisión clave 2 — el enqueuer es un port (Strategy):** la interface
`application.Enqueuer` se define en la capa de aplicación. Hay dos
implementaciones detrás:
- `InProcess` — `EnqueueInspiration` lanza `go svc.RunCommand(context.Background(), cmd)`.
  Dev/stub.
- `AsynqEnqueuer` — serializa el command a JSON y `client.EnqueueContext(task)`.
  Producción.

El handler HTTP solo conoce el port, no la implementación. Cambiar de
"goroutina in-process" a "Redis + cmd/worker" es una línea en `container.go`.

---

### 5. Infraestructura / composition root — `internal/infrastructure/`

**`container.go`** construye singletons en `NewContainer(cfg)`:

```go
func (c *Container) buildJobStore() port.JobStore {
    if c.Cfg.UsesAsynq() {
        return redisstore.NewJobStore(c.Cfg.RedisAddr)
    }
    return stub.NewInMemoryJobStore()
}

func (c *Container) buildEnqueuer() application.Enqueuer {
    if c.Cfg.UsesAsynq() {
        return queue.NewAsynqEnqueuer(c.Cfg.RedisAddr)
    }
    return queue.NewInProcess(c.inspiration)
}
```

Las dos elecciones (`JobStore` y `Enqueuer`) están atadas por `QueueDriver`: si
hay asynq, **también** el job store es Redis — porque API y worker son procesos
distintos y necesitan estado compartido.

---

## El detalle multi-proceso

`apps/api` (Python) usa `arq`. `apps/api-go` usa `asynq` con el **mismo modelo**:

```
QUEUE_DRIVER=asynq
        │
        ▼
[cmd/api]                                 [cmd/worker]   ← otro proceso
  HTTP /inspiration/search                  asynq.NewServer
  Start(pending) en Redis                   pool de N goroutines
  Enqueuer.EnqueueInspiration              consumen la cola
        │                                  HandleGenerate(task)
        ▼                                  → InspirationService.RunCommand
  202 + job_id                              → escribe ready en mismo Redis
                                                       │
  GET /inspiration/{jobId}      ◄──── lee status ready desde Redis
```

El dominio y los use cases son **idénticos** en ambos modos. El cambio es solo
de adapter (enqueuer + job store). Esta es la prueba de fuego de que la
hexagonal vale lo que cuesta.

---

## Diagrama: una request real recorre las capas

`POST /campaigns/publish-from-job`:

```
HTTP
  ▼
[Inbound HTTP] handler.go: publishFromJob(w, r)
       │ json.Decode + valida → SelectAndPublishCommand
       ▼
[Application] CampaignService.PublishFromJob(ctx, cmd)
       ▼
[Dominio] SelectAssetsAndPublishUseCase.Execute(ctx, cmd)
       ├─ jobStore.Get(ctx, jobId)        ─┐
       ├─ valida estado (JobReady?)        │  habla por
       └─ CreateCampaignUseCase.Execute    │  INTERFACES (ports)
             ├─ adPlatform.Create*         │
             └─ campaignRepo.Save(ctx, c)  ─┘
       ▼
[Outbound] container elige stub o real
       ▲
[Inbound HTTP] toCampaignResponse(c) → 201 JSON snake_case
       │ si error: errors.Is(err, ErrNotFound) → writeError → 404
```

---

## Pruebas — qué se prueba en cada capa

| Capa | Tipo de test | Archivos |
|---|---|---|
| Use cases | unit con stubs directos | `internal/domain/usecase/create_campaign_test.go`, `generate_inspiration_test.go` |
| HTTP completo | smoke E2E con `httptest.NewServer` | `internal/adapter/inbound/http/handler_test.go` |
| Concurrencia | mismo set con `-race` | `go test -race ./...` |

`go vet ./...` y `gofmt -l .` se ejecutan en CI. El "no hay data races" es una
garantía mecánica, no un acto de fe.
