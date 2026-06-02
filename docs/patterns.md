# Patrones de diseño usados en el proyecto

Catálogo de los patrones aplicados en la API en Go (`apps/api-go/`) y el
frontend en Angular (`apps/web-angular/`), con la ruta exacta de cada uno.

> Convenciones de las tablas:
> - **Pattern** — nombre del patrón.
> - **Qué hace aquí** — qué problema resuelve en este código.
> - **Dónde está** — archivo(s) y símbolo(s) a buscar.

---

## Arquitectura compartida (Go + Angular)

Ambas apps siguen una **arquitectura por capas con dirección de dependencias hacia adentro**:

- **Go** — Hexagonal (Ports & Adapters): `internal/domain/` no depende de nada externo.
- **Angular** — Feature-based: `core/` y `shared/` no importan `features/`; las features no se importan entre sí.

La regla la verifica el subagente `architecture-guardian` en `.claude/agents/architecture-guardian.md`.

---

## Patrones en Go — `apps/api-go/`

| Pattern | Qué hace aquí | Dónde está |
|---|---|---|
| **Ports & Adapters (Hexagonal)** | El dominio declara interfaces (`AdPlatform`, `CampaignRepository`, `ImageGenerator`, `CopyGenerator`, `AdLibrary`, `Storage`, `JobStore`, `ClientRepository`); los adaptadores las implementan. | Ports: `internal/domain/port/outbound.go`. Adaptadores: `internal/adapter/outbound/stub/*.go`, `internal/adapter/outbound/queue/`, `internal/adapter/outbound/redisstore/`. |
| **Strategy** (selección de implementación) | El driver de cola (`inprocess` vs. `asynq`) y el job store (in-memory vs. Redis) se eligen por configuración detrás del mismo port. | `internal/infrastructure/container.go` → `buildEnqueuer`, `buildJobStore`. |
| **Factory / Composition Root** | Único lugar que conoce los tipos concretos y los cablea con los servicios. | `internal/infrastructure/container.go` → `Container`, `NewContainer`. |
| **Constructor Injection (DI manual)** | Cada `New…` recibe sus dependencias como interfaces. | Todos los `NewXxxUseCase(...)` en `internal/domain/usecase/`, `NewCampaignService` / `NewInspirationService` en `internal/application/`. |
| **Builder** (fluente + validación en `Build()`) | Ensambla el agregado `Campaign` paso a paso desde varias llamadas a la plataforma. | `internal/domain/model/campaign_builder.go` → `CampaignBuilder`. Lo usa `internal/domain/usecase/create_campaign.go`. |
| **Builder** (variante para strings) | Arma el prompt de imagen por fragmentos (producto, mercado, estilo). | `internal/adapter/outbound/stub/image_generator.go` → `AdPromptBuilder`. |
| **Command (DTO de intención)** | Encapsula la entrada de un use case en una struct legible y extensible. | `internal/domain/usecase/create_campaign.go` (`CreateCampaignCommand`), `generate_inspiration.go` (`GenerateInspirationCommand`), `select_and_publish.go` (`SelectAndPublishCommand`). |
| **Functional Options** | Configuración opcional y extensible del servidor HTTP sin romper la firma. | `internal/adapter/inbound/http/server.go` → `Option`, `WithReadTimeout`, `WithWriteTimeout`, `WithIdleTimeout`. Uso en `cmd/api/main.go`. |
| **Decorator / Middleware** | Logging y `recover` componibles para cualquier `http.Handler`. | `internal/adapter/inbound/http/middleware.go` → `withLogging`, `withRecover`. Composición en `handler.go` → `Routes()`. |
| **Repository** | Persistencia abstraída detrás de una interfaz; stub in-memory hoy, Postgres mañana. | Port: `internal/domain/port/outbound.go` (`CampaignRepository`, `ClientRepository`). Impl: `internal/adapter/outbound/stub/repository.go`. |
| **Adapter** (envoltorios sobre librerías) | Encapsula llamadas a librerías externas para que el dominio solo vea el port. | `internal/adapter/outbound/queue/asynq_enqueuer.go` (asynq), `internal/adapter/outbound/redisstore/job_store.go` (go-redis), stubs en `internal/adapter/outbound/stub/`. |
| **Producer / Consumer (cola)** | Productor encola tareas en Redis; consumidor (proceso aparte) las ejecuta. | Productor: `internal/adapter/outbound/queue/asynq_enqueuer.go` + `cmd/api/main.go`. Consumidor: `cmd/worker/main.go` + `internal/adapter/inbound/worker/inspiration_worker.go`. |
| **Worker Pool** (paralelismo gestionado) | `asynq.Config{Concurrency: N}` arranca N goroutines consumiendo tareas. | `cmd/worker/main.go` → `asynq.NewServer(..., asynq.Config{Concurrency: 10})`. |
| **Concurrent Fan-out** (`sync.WaitGroup`) | Imágenes y copies se generan en paralelo dentro del pipeline. | `internal/domain/usecase/generate_inspiration.go` — bloque con `wg.Add(2)` + dos `go func()` + `wg.Wait()`. |
| **Sentinel Errors** + `errors.Is` (idioma Go) | Errores de dominio comparables a través de envolturas `%w`. | `internal/domain/model/errors.go` (`ErrNotFound`, `ErrInvalidState`, `ErrValidation`, `ErrAdPlatform`). Mapeo a HTTP: `internal/adapter/inbound/http/respond.go` → `writeError`. |
| **Singleton (por proceso)** | Los stores y clientes externos se construyen una vez en el container. | Campos de `Container` en `internal/infrastructure/container.go` (todos los `port.*` y `inspiration`/`enqueuer`). |

---

## Patrones en Angular — `apps/web-angular/`

| Pattern | Qué hace aquí | Dónde está |
|---|---|---|
| **Adapter / Gateway** (HTTP tipado) | Envuelve `HttpClient` con una API tipada que habla el dominio del backend. | `src/app/core/api/api-client.ts` → `ApiClient`. |
| **Chain of Responsibility** (interceptores HTTP funcionales) | Pipeline de interceptores: prefijo de base URL, normalización de errores. | `src/app/core/interceptors/base-url.interceptor.ts`, `src/app/core/interceptors/error.interceptor.ts`. Registro: `src/app/app.config.ts` → `withInterceptors([...])`. |
| **Dependency Injection con `InjectionToken`** | Configuración inyectable y reemplazable en tests/entornos. | `src/app/core/api/api-config.ts` → `API_BASE_PATH`. |
| **Singleton Service** (`providedIn: 'root'`) | Servicios singleton vía Angular DI. | Todos los `@Injectable({ providedIn: 'root' })`: `clients.service.ts`, `inspiration.service.ts`, `campaigns.service.ts`, `notification.service.ts`, `api-client.ts`. |
| **Facade + Store reactivo (signals)** | Oculta `ApiClient` + estado async detrás de signals que los componentes consumen. | `src/app/features/clients/data/clients.service.ts`, `src/app/features/inspiration/data/inspiration.service.ts`, `src/app/features/campaigns/data/campaigns.service.ts`. |
| **Observer** (con signals) | El productor `error.interceptor.ts` empuja al servicio; el consumidor `toast.ts` reacciona vía signal — sin acoplarse. | Subject: `src/app/core/notifications/notification.service.ts` → `items` (signal). Consumidor: `src/app/shared/components/toast.ts`. |
| **Observer (RxJS reactive)** | Polling del job: `interval(2000)` + `switchMap(getJob)` + `takeWhile(no_terminal, true)`. | `src/app/features/inspiration/data/inspiration.service.ts` → método `poll`. |
| **Builder** | Arma `PublishFromJobRequest` desde tres fuentes (cliente, formulario, selección) con pasos fluidos. | `src/app/features/campaigns/domain/publish-request.builder.ts` → `PublishRequestBuilder`. Uso: `features/campaigns/pages/new-campaign-page.ts` → `onPublish()`. |
| **Container / Presentational** | "Smart" inyectan facades; "dumb" solo reciben `input()` y emiten `output()`. | Smart (containers): `features/*/pages/*.ts` (`campaigns-page.ts`, `new-campaign-page.ts`, `campaign-detail-page.ts`, `clients-page.ts`). Presentational: `shared/components/*.ts`, `features/*/ui/*.ts`. |
| **Composition Root (route-level)** | Página que cablea varias features cuando un flujo las cruza. | `src/app/features/campaigns/pages/new-campaign-page.ts` — wizard que une clients + inspiration + campaigns. |
| **Reactive Forms** (FormGroup tipado) | Modelo de formulario tipado con validadores declarativos. | `src/app/features/campaigns/ui/campaign-form.ts` — `NonNullableFormBuilder` + `Validators`. |
| **Strategy** (Pipe como estrategia de formato) | Transformación memoizada por input (centavos → moneda). | `src/app/shared/pipes/budget.pipe.ts` → `BudgetPipe`. |
| **Mediator (vía outputs)** | Los hijos no se hablan entre sí; emiten eventos hacia la página, que decide qué hacer. | Selector de cliente: `features/clients/ui/client-selector.ts` (`selected` output). Selectores de imagen/copy: `features/inspiration/ui/image-selector.ts`, `copy-selector.ts`. |
| **Reactive Derivations** (`computed`) | Estado derivado, recomputado solo cuando cambian sus señales fuente. | `features/campaigns/pages/new-campaign-page.ts` → `selectedImage`, `selectedCopy`, `canPublish`. `inspiration.service.ts` → `isReady`, `isFailed`, `isRunning`, `images`, `copies`. |
| **Reactive Effect** (`effect`) | Reaccionar a un cambio de input sin suscripciones manuales. | `features/campaigns/pages/campaign-detail-page.ts` — `effect(() => this.campaigns.load(this.id()))`. |
| **Smart routing binding** | El parámetro de ruta `:id` llega como `input()` en el componente. | `app.config.ts` → `provideRouter(routes, withComponentInputBinding())`. Uso: `campaign-detail-page.ts` → `id = input.required<string>()`. |
| **Lazy Loading / Code splitting** | Cada página viaja en su propio chunk; se carga al navegar. | `src/app/app.routes.ts` — `loadComponent: () => import(...)`. Visible en los chunks de `pnpm build` (`new-campaign-page`, `campaign-detail-page`, ...). |
| **Optimistic UI** | El facade muestra el cambio antes de la respuesta del backend y revierte si falla. | `features/campaigns/data/campaigns.service.ts` → `updateStatus`. |

---

## Patrones que aparecen en ambos (para comparar idiomas)

| Pattern | Go | Angular |
|---|---|---|
| **Adapter** | `internal/adapter/outbound/queue/asynq_enqueuer.go`, `redisstore/job_store.go`, `stub/*.go` | `core/api/api-client.ts` |
| **Facade** (cara hacia los consumidores) | `internal/application/campaign_service.go`, `inspiration_service.go` | `features/*/data/*.service.ts` |
| **Builder** | `internal/domain/model/campaign_builder.go`, `stub/image_generator.go` (`AdPromptBuilder`) | `features/campaigns/domain/publish-request.builder.ts` |
| **Strategy** (selección por config) | `internal/infrastructure/container.go` (`buildEnqueuer`, `buildJobStore`) | `core/api/api-config.ts` (`API_BASE_PATH`, sustituible por DI) |
| **Composition Root** | `cmd/api/main.go` + `cmd/worker/main.go` + `Container` | `features/campaigns/pages/new-campaign-page.ts` (route-level), `app.config.ts` (DI-level) |
| **Observer / reactive** | `sync.WaitGroup` (fan-out paralelo) | signals + RxJS `interval`/`switchMap`/`takeWhile` |
| **DI por constructor** | `NewXxx(deps...)` | `inject(Service)` en clases y funciones |
| **Singleton** | campos del `Container` | `@Injectable({ providedIn: 'root' })` |

---

## Cómo navegar este documento

- Cada celda **Dónde está** es un *grep target*. Ejemplo:
  `rg -n "CampaignBuilder" apps/api-go/internal/domain/model/`
- Los nombres de tipos, funciones e identificadores son los reales del código —
  si renombras algo, actualiza la celda correspondiente para que el doc no rote.
