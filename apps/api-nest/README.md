# Meta Ads Platform API — implementación en NestJS

Reimplementación del microservicio en **NestJS 11** + TypeScript, pensada como
material de estudio. Misma **arquitectura hexagonal (Ports & Adapters)** que las
versiones en Python y Go, traducida a los idiomas de Nest: módulos,
decoradores, DI por símbolo, pipes, filtros e interceptores.

Runnable en **modo stub** (in-memory) sin servicios externos.

## Correr

```bash
cd apps/api-nest
pnpm install
pnpm start:dev               # http://localhost:8080
curl localhost:8080/health

pnpm test                    # unit tests (Jest)
pnpm test:e2e                # end-to-end con supertest
pnpm build                   # compila a dist/
```

## Estructura

```
apps/api-nest/
├── src/
│   ├── main.ts                          # bootstrap + ValidationPipe global
│   ├── app.module.ts                    # root module (composition)
│   ├── domain/                          # NÚCLEO sin frameworks
│   │   ├── models/                      # entidades puras + CampaignBuilder
│   │   ├── errors/                      # NotFoundError, ValidationError, …
│   │   ├── ports/                       # interfaces + Symbol tokens (DI)
│   │   └── use-cases/                   # casos de uso (@Injectable, ports inyectados)
│   ├── application/                     # services + ApplicationModule
│   ├── adapters/
│   │   ├── inbound/http/                # controllers, DTOs, filter, interceptor, mappers
│   │   └── outbound/stub/               # implementaciones in-memory de todos los ports
│   ├── infrastructure/
│   │   └── ports.module.ts              # @Global — único lugar que conoce los stubs
│   └── modules/                         # módulos por recurso (campaigns/inspiration/clients/…)
└── test/                                # e2e con @nestjs/testing + supertest
```

## Patrones de diseño en el código (para estudiar)

> Catálogo completo y comparativo (Python · Go · Angular · NestJS):
> [`../../docs/patterns.md`](../../docs/patterns.md).

- **Ports & Adapters (Hexagonal)** — interfaces en `domain/ports/*.port.ts` con
  `Symbol` tokens; implementaciones en `adapters/outbound/stub/*`.
- **DI por símbolo** — Nest no puede usar interfaces TS como llaves; cada port
  exporta un `Symbol` y los use cases lo inyectan con `@Inject(TOKEN)`.
- **Composition Root con NestJS Module** —
  `src/infrastructure/ports.module.ts` (`@Global()`) es el único sitio que
  cablea concretos a ports. Cambiar de stub a real es cambiar un `useClass`.
- **Module / Provider Factory** — `useClass`, `useFactory`, `useValue` son las
  tres variantes; ver `providers: [...]` en `ports.module.ts` y `app.module.ts`.
- **Use Case / Interactor** — clases puras en `domain/use-cases/*` con
  `execute(cmd)`; sólo dependen de ports.
- **Builder** — `CampaignBuilder` (`domain/models/campaign.builder.ts`) y
  `AdPromptBuilder` (`adapters/outbound/stub/stub-image-generator.ts`).
- **Command (DTO de intención)** — `CreateCampaignCommand`,
  `GenerateInspirationCommand`, `SelectAndPublishCommand` en cada use case.
- **Facade** — `CampaignsService` e `InspirationService` (`application/`)
  agrupan use cases para los controllers.
- **Repository** — `CampaignRepositoryPort`, `ClientRepositoryPort` (ports);
  implementaciones in-memory en `adapters/outbound/stub/`.
- **Adapter** — los `Stub*` en `adapters/outbound/stub/` adaptan "datos
  inventados" a las interfaces; un adapter real para Meta CLI / Higgsfield /
  Claude entraría exactamente al mismo lugar.
- **Exception Filter (mapper de errores)** —
  `adapters/inbound/http/filters/domain-exception.filter.ts` traduce
  `NotFoundError`→404, `ValidationError`/`InvalidStateError`→400, etc.
- **Interceptor (Decorator/Around-advice)** —
  `adapters/inbound/http/interceptors/logging.interceptor.ts` envuelve cada
  handler con logging método/path/status/latencia.
- **Pipe (Validation Pipe + class-validator)** — `ValidationPipe` global en
  `main.ts` corre los DTOs (`@IsString`, `@Length`, `@IsIn`, etc.) antes de
  llegar al controller.
- **Concurrencia con `Promise.all`** — imágenes ∥ copies en paralelo en
  `domain/use-cases/generate-inspiration.use-case.ts` (equivalente del
  `WaitGroup` de Go).
- **Background work (fire-and-forget)** —
  `InspirationService.startAndRun` devuelve `202` y deja el pipeline corriendo
  con `void this.generate.execute(...).catch(...)`. Para producción se cambia
  por un job de Bull/BullMQ (mismo seam, otro adapter).
- **Decorators como pegamento** — `@Controller`, `@Get/@Post/@Patch/@Delete`,
  `@Body`, `@Param`, `@Query`, `@Inject`, `@Module`, `@Injectable`,
  `@Catch`, `@Global`. Casi todo el wiring es declarativo.

## Mapeo Python ⇄ Go ⇄ NestJS

| Concepto | Python (FastAPI) | Go (stdlib) | NestJS |
|---|---|---|---|
| Port (interfaz) | `IAdPlatform(ABC)` | `port.AdPlatform` (interface) | `AdPlatformPort` + `AD_PLATFORM` (Symbol) |
| Inyección | constructor manual | constructor manual | `@Inject(TOKEN)` + Nest DI container |
| Composition root | `infrastructure/container.py` | `internal/infrastructure/container.go` | `PortsModule` + `ApplicationModule` |
| Validación request | Pydantic | `decode` + reglas a mano | `class-validator` DTOs + `ValidationPipe` |
| Mapeo errores → HTTP | `HTTPException` en routers | `writeError` en `respond.go` | `DomainExceptionFilter` (`@Catch`) |
| Logging | `logging` | `log/slog` + `withLogging` middleware | `LoggingInterceptor` |
| Background work | `BackgroundTasks` / `arq` | goroutine / `asynq` | fire-and-forget / `@nestjs/bull` |

## Endpoints (compatibles wire con las otras APIs)

`GET /health`, `GET /clients`, `GET /clients/:id`,
`GET|POST /campaigns`, `POST /campaigns/publish-from-job`,
`GET /campaigns/:id`, `PATCH /campaigns/:id/status`,
`GET /campaigns/:id/insights`, `DELETE /campaigns/:id`,
`POST /inspiration/search`, `GET /inspiration/:jobId`,
`POST /webhooks/higgsfield/:jobId`.
