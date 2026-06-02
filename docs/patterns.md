# Patrones de diseño usados en el proyecto

Catálogo de los patrones aplicados en la API en Go (`apps/api-go/`), la API en
NestJS (`apps/api-nest/`) y el frontend en Angular (`apps/web-angular/`). Cada
entrada cubre:

- **Problema** — la dolencia que el patrón cura.
- **Cuándo agregarlo** — señales que te indican que conviene usarlo.
- **Cuándo NO** — cuando es ruido, overhead o "sobre-ingeniería".
- **Dónde está aquí** — archivo(s) y símbolo(s) a buscar (objetivos de `rg`).

> Los "cuándo no" son tan importantes como los "cuándo". Casi todos estos
> patrones se vuelven anti-patrones cuando se aplican fuera de su problema real.

---

## Arquitectura compartida (Go + Angular)

Ambas apps imponen una **dirección de dependencias hacia adentro**:

- **Go** — Hexagonal (Ports & Adapters): `internal/domain/` no depende de nada externo.
- **Angular** — Feature-based: `core/` y `shared/` no importan `features/`; las features no se importan entre sí.

La regla la verifica el subagente `architecture-guardian` (`.claude/agents/architecture-guardian.md`).

---

## Patrones en Go — `apps/api-go/`

### Ports & Adapters (Hexagonal)

- **Problema:** el dominio queda atado a IO concreto (BD, HTTP, SDKs); cambiar de proveedor obliga a tocar lógica de negocio; tests requieren la infra real.
- **Cuándo agregarlo:** hay ≥1 dependencia externa que podría reemplazarse (DB, IA, mensajería); el negocio tiene lógica propia testeable en aislamiento.
- **Cuándo NO:** CRUD trivial sin lógica, scripts o CLIs cortos, un único endpoint que solo proxea — el overhead de tres capas no se paga.
- **Dónde:** ports en `internal/domain/port/outbound.go`; adapters en `internal/adapter/outbound/{stub,queue,redisstore}/`.

### Strategy (selección por configuración)

- **Problema:** dos implementaciones legítimas del mismo comportamiento producen `if/else` regados.
- **Cuándo agregarlo:** la implementación cambia por entorno o por tenant; necesitas un fake para tests.
- **Cuándo NO:** solo hay una implementación real ahora y ninguna en el horizonte (YAGNI); las diferencias son un parámetro, no un comportamiento.
- **Dónde:** `internal/infrastructure/container.go` → `buildEnqueuer`, `buildJobStore` eligen `InProcess`/`Asynq` o `InMemory`/`Redis`.

### Factory / Composition Root

- **Problema:** la construcción de dependencias se desparrama; ningún sitio sabe "el grafo completo"; los tests no pueden sustituir piezas.
- **Cuándo agregarlo:** ≥2-3 servicios con dependencias compartidas; quieres swap por config.
- **Cuándo NO:** 1-2 servicios sin variabilidad; un `main()` chico hace el cableado claramente.
- **Dónde:** `internal/infrastructure/container.go` → `Container`, `NewContainer`.

### Constructor Injection (DI manual)

- **Problema:** dependencias ocultas (`globalDB`, `init()` mágicos) hacen el código no testeable.
- **Cuándo agregarlo:** siempre que un componente use IO o servicios externos.
- **Cuándo NO:** utilidades puras, estructuras de datos, constantes — no necesitan inyectarse.
- **Dónde:** `NewXxxUseCase(...)` en `internal/domain/usecase/`; `NewCampaignService`/`NewInspirationService` en `internal/application/`.

### Builder (`CampaignBuilder`)

- **Problema:** ensamblar un agregado complejo desde varias llamadas externas que aportan IDs; constructors con 10 parámetros; validación a destiempo.
- **Cuándo agregarlo:** el objeto se construye en pasos (varias respuestas remotas), tiene muchos campos opcionales, y quieres validar una sola vez al final.
- **Cuándo NO:** ≤4 campos; un struct literal o `New(args)` basta. No agregues builder solo "por estética".
- **Dónde:** `internal/domain/model/campaign_builder.go`. Lo usa `internal/domain/usecase/create_campaign.go`.

### Builder (`AdPromptBuilder`, para strings)

- **Problema:** un `fmt.Sprintf` largo con muchos `%s` para componer texto se vuelve ilegible y difícil de testear por fragmento.
- **Cuándo agregarlo:** el texto se compone de fragmentos opcionales o condicionales (estilo, idioma, contexto) y cada parte merece existir aislada.
- **Cuándo NO:** una línea con 2-3 variables; `fmt.Sprintf` es perfectamente claro.
- **Dónde:** `internal/adapter/outbound/stub/image_generator.go` → `AdPromptBuilder`.

### Command (DTO de intención)

- **Problema:** funciones con muchos parámetros, evolución dolorosa (cualquier campo nuevo rompe firmas), confusión por orden.
- **Cuándo agregarlo:** ≥4 parámetros, varios opcionales; quieres que añadir un campo sea no-breaking.
- **Cuándo NO:** 1-2 parámetros claros; agregar un Command DTO es ceremonia.
- **Dónde:** `CreateCampaignCommand`, `GenerateInspirationCommand`, `SelectAndPublishCommand` en `internal/domain/usecase/*.go`.

### Functional Options

- **Problema:** una API que necesita muchas opciones opcionales; structs de Config públicas crecen sin control; constructors con 8 args.
- **Cuándo agregarlo:** estás escribiendo una pieza reutilizable y quieres que añadir opciones no rompa código cliente.
- **Cuándo NO:** 1-2 opciones estables; un struct `Config{}` exportado es más directo y menos código.
- **Dónde:** `internal/adapter/inbound/http/server.go` → `Option`, `WithReadTimeout`, `WithWriteTimeout`, `WithIdleTimeout`. Uso: `cmd/api/main.go`.

### Decorator / Middleware HTTP

- **Problema:** lógica transversal (logging, auth, recover) repetida en cada handler.
- **Cuándo agregarlo:** un comportamiento aplica a varios handlers; quieres componerlo o desactivarlo selectivamente.
- **Cuándo NO:** la lógica solo afecta a un handler — vive ahí, no necesita ser middleware.
- **Dónde:** `internal/adapter/inbound/http/middleware.go` → `withLogging`, `withRecover`. Composición en `handler.go` → `Routes()`.

### Repository

- **Problema:** SQL/queries dentro del dominio acoplan el negocio a un motor; tests requieren BD real.
- **Cuándo agregarlo:** hay un agregado con vida propia; quieres correr tests sin BD; planeas cambiar el storage.
- **Cuándo NO:** app de read-only sobre vistas (la BD ES el modelo); un endpoint trivial con `database/sql` directo. No envuelvas por envolver.
- **Dónde:** ports en `internal/domain/port/outbound.go` (`CampaignRepository`, `ClientRepository`); impl: `internal/adapter/outbound/stub/repository.go`.

### Adapter (envoltorios sobre librerías de terceros)

- **Problema:** el dominio depende directamente de una lib externa; cambiarla rompe todo el árbol.
- **Cuándo agregarlo:** la librería tiene API caprichosa o cambia seguido (SDKs cloud, AI, colas).
- **Cuándo NO:** la "lib" es la stdlib o un estándar estable (`log/slog`, `net/http`) — envolverla agrega ruido sin beneficio.
- **Dónde:** `internal/adapter/outbound/queue/asynq_enqueuer.go`, `redisstore/job_store.go`, `stub/*.go`.

### Producer / Consumer (cola)

- **Problema:** el request HTTP no puede esperar 30s; si el proceso muere se pierden jobs en vuelo; no escalas workers independientes.
- **Cuándo agregarlo:** trabajo asincrónico largo, necesitas reintentos persistentes, varios consumidores escalando independiente.
- **Cuándo NO:** trabajo de <100ms; una goroutina sirve. No agregues Redis si no operas Redis.
- **Dónde:** productor en `internal/adapter/outbound/queue/asynq_enqueuer.go` + `cmd/api/main.go`; consumidor en `cmd/worker/main.go` + `internal/adapter/inbound/worker/inspiration_worker.go`.

### Worker Pool

- **Problema:** lanzar una goroutina por cada job satura recursos (memoria, conexiones de BD).
- **Cuándo agregarlo:** muchos jobs concurrentes contra recursos limitados; quieres throughput controlado.
- **Cuándo NO:** baja concurrencia o jobs muy cortos; "una goroutina por job" puede bastar.
- **Dónde:** `cmd/worker/main.go` → `asynq.NewServer(..., asynq.Config{Concurrency: 10})`.

### Fan-out concurrente (`sync.WaitGroup`)

- **Problema:** tareas independientes corren en serie sumando latencias.
- **Cuándo agregarlo:** ≥2 llamadas I/O-bound independientes; el tiempo total importa.
- **Cuándo NO:** las tareas dependen entre sí, el orden importa, o una es trivial — el costo de coordinar (mutex/channels) supera el beneficio.
- **Dónde:** `internal/domain/usecase/generate_inspiration.go` — bloque `wg.Add(2)` + dos `go func()` + `wg.Wait()`.

### Sentinel Errors + `errors.Is`

- **Problema:** comparar errores por string es frágil; tipos custom por cada caso son ruido.
- **Cuándo agregarlo:** pocos errores con semántica universal (NotFound, Invalid, Conflict) que el caller debe distinguir.
- **Cuándo NO:** errores ricos en contexto (campos del fallo) → mejor structs con `Unwrap()`. Si el caller solo quiere saber "falló", `error` desnudo basta.
- **Dónde:** `internal/domain/model/errors.go`; mapeo a HTTP en `internal/adapter/inbound/http/respond.go` → `writeError`.

### Singleton por proceso

- **Problema:** crear clientes pesados (pools de conexión, clientes HTTP) por request es caro.
- **Cuándo agregarlo:** recursos con estado interno reusable (pools, caches, clientes con keep-alive).
- **Cuándo NO:** objetos baratos de crear; estado compartido con riesgo de race conditions; tests que se contaminan unos a otros.
- **Dónde:** los campos del `Container` en `internal/infrastructure/container.go` se construyen una vez en `NewContainer`.

---

## Patrones en NestJS — `apps/api-nest/`

> Casi todos los patrones de Go aplican igual (Hexagonal, Use Cases, Command,
> Builder, Repository, Adapter, Facade, Singleton). Aquí se listan los que Nest
> codifica con sus propias primitivas y los que aparecen específicamente en su
> versión del código.

### Composition Root con NestJS Module + Provider Factory

- **Problema:** el cableado de adapters concretos se desparrama por la app; cambiar uno requiere tocar varios sitios.
- **Cuándo agregarlo:** siempre que uses Nest — los módulos SON el composition root del framework.
- **Cuándo NO:** scripts puntuales sin DI; en una app Nest no aplica el "no".
- **Dónde:** `src/infrastructure/ports.module.ts` (`@Global()` con `useClass` por port). Cambiar a real es cambiar la implementación en `useClass` o pasar a `useFactory`.

### DI por símbolo (interfaces no son runtime)

- **Problema:** TypeScript borra las interfaces en runtime, así que Nest no puede usarlas como llaves de inyección.
- **Cuándo agregarlo:** cada vez que inyectes una interfaz (`Port`) en lugar de una clase concreta.
- **Cuándo NO:** si inyectas una clase concreta, el constructor solo necesita el tipo de la clase — Nest la resuelve sin tokens extra.
- **Dónde:** cada `*.port.ts` exporta su token (`export const AD_PLATFORM = Symbol('AdPlatformPort')`). Consumo: `@Inject(AD_PLATFORM) private p: AdPlatformPort` en cada use case.

### Provider Factory (`useFactory` / `useClass` / `useValue`)

- **Problema:** elegir la implementación de un provider en función de configuración o de otros providers.
- **Cuándo agregarlo:** `useFactory` cuando la elección depende de `ConfigService` (stub vs. real); `useValue` para constantes/tokens; `useClass` para el caso simple.
- **Cuándo NO:** un `useClass` resuelve el 80% — no compliques con factories si no dependes de runtime config.
- **Dónde:** `src/infrastructure/ports.module.ts` (hoy todo `useClass`, el comentario muestra dónde entraría `useFactory`); `src/app.module.ts` registra `APP_FILTER`/`APP_INTERCEPTOR` con `useClass`.

### Pipe + class-validator (Validation Pipe)

- **Problema:** validar manualmente cada payload en cada controller es repetitivo y propenso a errores.
- **Cuándo agregarlo:** cualquier endpoint con body/params/query no triviales — declara validación en el DTO y olvídate.
- **Cuándo NO:** endpoint que NO recibe payload (un `GET` sin params); no instancies un pipe ad-hoc para nada.
- **Dónde:** `ValidationPipe` global en `src/main.ts`; reglas en los DTOs `src/adapters/inbound/http/dto/*.dto.ts` (`@IsString`, `@Length`, `@IsIn`, …).

### Exception Filter (mapeo de errores)

- **Problema:** los controllers terminan con `try/catch` repetidos para traducir errores de dominio a HTTP.
- **Cuándo agregarlo:** tienes 2+ tipos de error que mapean a status codes distintos.
- **Cuándo NO:** un solo tipo de error trivial — un `HttpException` desde el controller alcanza.
- **Dónde:** `src/adapters/inbound/http/filters/domain-exception.filter.ts` (`@Catch(DomainError)`). Registro global: `app.module.ts` → `APP_FILTER`.

### Interceptor (Decorator / Around-advice)

- **Problema:** lógica transversal (logs, métricas, cache, transformaciones de respuesta) replicada en cada handler.
- **Cuándo agregarlo:** comportamiento que aplica a varios handlers, ideal pre/post-call.
- **Cuándo NO:** lógica específica de un handler; mejor en el método del controller. Tampoco para validación → eso es un Pipe.
- **Dónde:** `src/adapters/inbound/http/interceptors/logging.interceptor.ts` (logs método/path/status/latencia). Registro global: `app.module.ts` → `APP_INTERCEPTOR`.

### Decoradores como pegamento

- **Problema:** la configuración por convención (qué es un controller, qué es un provider, dónde montar una ruta) escrita a mano es ceremonia.
- **Cuándo agregarlo:** ya estás en Nest — usar `@Controller`, `@Injectable`, `@Module`, `@Inject`, `@Get/@Post/@Patch`, `@Body`, `@Param`, `@Query`, `@Catch`, `@Global` es lo idiomático.
- **Cuándo NO:** no inventes decoradores propios sin necesidad; Nest ya cubre lo común.
- **Dónde:** repartidos por toda la app; ejemplos densos en cualquier controller (`adapters/inbound/http/controllers/`) y en cualquier use case (`domain/use-cases/`).

### Concurrencia con `Promise.all`

- **Problema:** llamadas asíncronas independientes ejecutadas en serie suman latencias.
- **Cuándo agregarlo:** ≥2 promesas independientes — el tiempo total cae al máximo de las dos.
- **Cuándo NO:** una depende del resultado de la otra; el orden importa; una es tan barata que el costo de coordinar no se paga.
- **Dónde:** `src/domain/use-cases/generate-inspiration.use-case.ts` — `await Promise.all([imageGen.generate(...), copyGen.generateCopies(...)])`.

### Background work (fire-and-forget)

- **Problema:** el cliente HTTP no puede esperar 30s mientras el pipeline corre.
- **Cuándo agregarlo:** trabajo no bloqueante que el cliente consultará por polling u otro canal.
- **Cuándo NO:** trabajo crítico que NO puede perderse (caída del proceso = job perdido) — para eso usa una cola persistente (Bull/BullMQ).
- **Dónde:** `src/application/inspiration.service.ts` → `startAndRun` lanza `void this.generate.execute(cmd).catch(...)` y devuelve 202.

---

## Patrones en Angular — `apps/web-angular/`

### Adapter / Gateway (`ApiClient`)

- **Problema:** `HttpClient` esparcido por componentes; rutas y headers hard-coded en N sitios; respuestas sin tipar.
- **Cuándo agregarlo:** ≥3 endpoints; el equipo trabaja en varias features; quieres tipado central.
- **Cuándo NO:** app de una sola pantalla con un solo GET; un `HttpClient` directo es más simple.
- **Dónde:** `src/app/core/api/api-client.ts`.

### Chain of Responsibility (interceptores HTTP funcionales)

- **Problema:** cada request necesita la misma transformación (auth header, base URL, logging) → código replicado.
- **Cuándo agregarlo:** comportamiento transversal a (casi) todas las llamadas HTTP.
- **Cuándo NO:** lógica específica de un endpoint — vive en el servicio que lo llama, no en un interceptor global.
- **Dónde:** `src/app/core/interceptors/base-url.interceptor.ts`, `error.interceptor.ts`. Registro: `src/app/app.config.ts` → `withInterceptors([...])`.

### DI con `InjectionToken`

- **Problema:** configuración hard-coded; difícil sobreescribir por entorno o en tests.
- **Cuándo agregarlo:** valores que cambian por entorno (API base, feature flags) o que quieres reemplazar en tests.
- **Cuándo NO:** constantes verdaderas que nunca cambian — un `export const` basta.
- **Dónde:** `src/app/core/api/api-config.ts` → `API_BASE_PATH`.

### Singleton Service (`providedIn: 'root'`)

- **Problema:** estado/lógica compartida entre componentes desacoplados.
- **Cuándo agregarlo:** estado de feature, cliente HTTP, cache, autenticación — cosas que viven mientras vive la app.
- **Cuándo NO:** estado de un solo componente → un `signal` local. Servicio que vive solo en un sub-tree → `providers: []` de ese componente, no `root`.
- **Dónde:** todos los `@Injectable({ providedIn: 'root' })`: facades en `features/*/data/`, `core/notifications/notification.service.ts`, `core/api/api-client.ts`.

### Facade + store reactivo (signals)

- **Problema:** componentes haciendo `http.get` + `subscribe` + estado local replicado en cada uno.
- **Cuándo agregarlo:** estado compartido entre varios componentes de la feature; quieres cache u optimismo.
- **Cuándo NO:** un único componente muestra los datos y no los retiene — `httpResource` o un subscribe directo es más simple.
- **Dónde:** `src/app/features/{clients,inspiration,campaigns}/data/*.service.ts`.

### Observer con signals (`NotificationService`)

- **Problema:** productor y consumidor de eventos sin acoplamiento directo (notificaciones globales).
- **Cuándo agregarlo:** un productor no sabe qué componentes consumen (toasts, eventos de sesión).
- **Cuándo NO:** el caller conoce a su receptor — una llamada directa es más clara y menos magia.
- **Dónde:** subject en `src/app/core/notifications/notification.service.ts` (`items` signal); consumidor `src/app/shared/components/toast.ts`.

### Observer RxJS (polling)

- **Problema:** necesitas reaccionar a un flujo asíncrono que produce muchos valores en el tiempo.
- **Cuándo agregarlo:** streams (websockets), polling, debounces, combinaciones de eventos.
- **Cuándo NO:** un solo valor → una `Promise` (`firstValueFrom`) o un `httpResource` es mucho más simple.
- **Dónde:** `src/app/features/inspiration/data/inspiration.service.ts` → método `poll` (`interval` + `switchMap` + `takeWhile`).

### Builder (`PublishRequestBuilder`)

- **Problema:** payload de muchos campos ensamblado desde varias fuentes (cliente, formulario, selección).
- **Cuándo agregarlo:** ≥3 fuentes de datos contribuyen al objeto; quieres validar una sola vez al final.
- **Cuándo NO:** el payload se arma en un solo lugar y tiene 3-4 campos — un literal `{ … }` basta.
- **Dónde:** `src/app/features/campaigns/domain/publish-request.builder.ts`. Uso: `pages/new-campaign-page.ts` → `onPublish`.

### Container / Presentational

- **Problema:** componentes "todo en uno" mezclan IO + render → no son reutilizables ni testeables.
- **Cuándo agregarlo:** la app crece y los componentes empiezan a tener varias responsabilidades.
- **Cuándo NO:** app de 1-2 pantallas; el desdoblamiento es ceremonia.
- **Dónde:** containers (smart): `features/*/pages/*.ts`. Presentational (dumb): `shared/components/*.ts`, `features/*/ui/*.ts`.

### Composition Root a nivel de ruta

- **Problema:** un flujo cruza varias features que no deben depender entre sí.
- **Cuándo agregarlo:** un wizard u onboarding tira de 2+ features.
- **Cuándo NO:** la feature se basta sola — no inventes un composer si no hay nada que componer.
- **Dónde:** `src/app/features/campaigns/pages/new-campaign-page.ts` (wizard que une clients + inspiration + campaigns).

### Reactive Forms (FormGroup tipado)

- **Problema:** validación, estado `dirty`/`touched`, controles dinámicos y tests son dolorosos con template-driven forms.
- **Cuándo agregarlo:** formularios con validación seria, controles dinámicos, o que quieras unit-testear.
- **Cuándo NO:** 1-2 inputs sueltos — `ngModel` o un signal local con `<input>` directo basta.
- **Dónde:** `src/app/features/campaigns/ui/campaign-form.ts`.

### Pipe (Strategy de formato)

- **Problema:** lógica de presentación repetida (formatos de fecha, moneda, plurales).
- **Cuándo agregarlo:** misma transformación en ≥2 templates; quieres memoización pura.
- **Cuándo NO:** transformación usada una vez en un solo sitio — un `computed` o un método inline es más simple.
- **Dónde:** `src/app/shared/pipes/budget.pipe.ts`.

### Mediator (vía outputs)

- **Problema:** dos hijos hablándose directamente generan acoplamiento y no son reutilizables.
- **Cuándo agregarlo:** dos o más hermanos coordinan algo — el padre orquesta vía `(event)`.
- **Cuándo NO:** comunicación natural padre↔hijo directa; o estado verdaderamente global → mejor un signal compartido.
- **Dónde:** `features/clients/ui/client-selector.ts` (`selected`), `features/inspiration/ui/{image,copy}-selector.ts` (`select`).

### `computed` (derivaciones reactivas)

- **Problema:** re-cálculo manual de estado derivado; getters que se evalúan en cada CD.
- **Cuándo agregarlo:** estado derivado de signals — memoización automática y solo recomputa cuando cambian sus fuentes.
- **Cuándo NO:** cálculo trivial inline en la plantilla; no hay dependencia reactiva.
- **Dónde:** `features/campaigns/pages/new-campaign-page.ts` (`selectedImage`, `selectedCopy`, `canPublish`); `features/inspiration/data/inspiration.service.ts` (`isReady`, `images`, `copies`).

### `effect` (side-effects reactivos)

- **Problema:** correr un side-effect cuando cambia un signal sin gestionar suscripciones a mano.
- **Cuándo agregarlo:** cargar datos al cambiar un input, sincronizar con `localStorage`, logging.
- **Cuándo NO:** para transformar estado → usa `computed`. Para event handlers → llama al método. `effect` no es un substituto de la lógica de inicialización.
- **Dónde:** `features/campaigns/pages/campaign-detail-page.ts` — `effect(() => this.campaigns.load(this.id()))`.

### Route input binding (`withComponentInputBinding`)

- **Problema:** leer route params con `ActivatedRoute.snapshot.paramMap` es verboso y no reactivo.
- **Cuándo agregarlo:** páginas con params simples (`:id`) que llegan siempre como el mismo input.
- **Cuándo NO:** lógica compleja con query params dinámicos o navegación condicional — suscríbete al observable y trabájalo.
- **Dónde:** `src/app/app.config.ts` → `provideRouter(routes, withComponentInputBinding())`. Uso: `pages/campaign-detail-page.ts` → `id = input.required<string>()`.

### Lazy Loading / code splitting

- **Problema:** bundle inicial pesado; pantallas que la mayoría no usa se cargan igual.
- **Cuándo agregarlo:** app con varias rutas; quieres mejorar TTI / FCP.
- **Cuándo NO:** app pequeña (1-2 rutas); el overhead del chunk loader y los waterfalls no se pagan.
- **Dónde:** `src/app/app.routes.ts` — `loadComponent: () => import(...)`. Visible en chunks de `pnpm build`.

### Optimistic UI

- **Problema:** UX percibida como lenta esperando confirmación del servidor en cada cambio trivial.
- **Cuándo agregarlo:** acciones con alta probabilidad de éxito (toggles, likes, status que casi nunca falla).
- **Cuándo NO:** operaciones críticas/destructivas (pagos, deletes) — mostrar éxito prematuro es peligroso y confunde al usuario.
- **Dónde:** `src/app/features/campaigns/data/campaigns.service.ts` → `updateStatus` (set local primero, revierte si error).

---

## Patrones que aparecen en varias apps (para comparar idiomas)

| Pattern | Go (`api-go`) | NestJS (`api-nest`) | Angular (`web-angular`) |
|---|---|---|---|
| Adapter | `internal/adapter/outbound/{queue,redisstore,stub}/*` | `src/adapters/outbound/stub/*` | `src/app/core/api/api-client.ts` |
| Facade | `internal/application/{campaign,inspiration}_service.go` | `src/application/{campaigns,inspiration}.service.ts` | `src/app/features/*/data/*.service.ts` |
| Builder | `internal/domain/model/campaign_builder.go`, `stub/image_generator.go` (`AdPromptBuilder`) | `src/domain/models/campaign.builder.ts`, `stub-image-generator.ts` (`AdPromptBuilder`) | `src/app/features/campaigns/domain/publish-request.builder.ts` |
| Command DTO | `internal/domain/usecase/*Command` | `src/domain/use-cases/*Command` (interfaces) | — (no aplica: Reactive Forms cumple el rol) |
| Composition Root | `cmd/api/main.go` + `Container` | `src/infrastructure/ports.module.ts` + `app.module.ts` | `pages/new-campaign-page.ts` (ruta), `app.config.ts` (DI) |
| Strategy (selección por config) | `internal/infrastructure/container.go` (`buildEnqueuer`, `buildJobStore`) | `useFactory` en `PortsModule` (cuando se active) | `core/api/api-config.ts` (`API_BASE_PATH` reemplazable vía DI) |
| DI por constructor | `NewXxx(deps...)` | `@Inject(TOKEN)` + Nest container | `inject(Service)` en clases/funciones |
| Singleton | campos del `Container` | `@Injectable()` provisto por un módulo (instancia única) | `@Injectable({ providedIn: 'root' })` |
| Concurrencia paralela | `sync.WaitGroup` (fan-out) | `await Promise.all([...])` | signals + RxJS `interval`/`switchMap`/`takeWhile` |
| Background work | goroutine + `context.Background()`; o `asynq` worker aparte | fire-and-forget `void promise.catch(...)`; o Bull/BullMQ | (no aplica en cliente) |
| Logging transversal | `withLogging` middleware (`func(http.Handler) http.Handler`) | `LoggingInterceptor` (`NestInterceptor`) | (no aplica en cliente) |
| Mapeo errores → HTTP | `writeError` + sentinels + `errors.Is` | `DomainExceptionFilter` (`@Catch(DomainError)`) | (HTTP errors → toast vía interceptor) |
| Validación de input | reglas a mano en handlers | `ValidationPipe` global + `class-validator` DTOs | Reactive Forms + `Validators` |

---

## Cómo navegar este documento

- Cada celda **Dónde está** es un *grep target*. Ejemplo:
  `rg -n "CampaignBuilder" apps/api-go/internal/domain/model/`
- Si renombras un símbolo, actualiza la línea correspondiente para que el doc
  no quede desincronizado del código.
- Una buena heurística cuando dudes: empieza **sin** el patrón; agrégalo el día
  que el dolor que cura aparezca de verdad. Casi todos los "cuándo NO" de este
  doc empiezan con "fue agregado por las dudas".
