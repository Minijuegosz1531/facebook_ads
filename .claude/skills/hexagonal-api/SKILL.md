---
name: hexagonal-api
description: Crea o extiende una API siguiendo la arquitectura Hexagonal (Ports & Adapters) documentada en el repo. Úsala cuando el usuario quiera agregar un caso de uso, un nuevo port + adapter, un endpoint HTTP, o scaffold de una API nueva en otro lenguaje. Apps de referencia (mirror estructural): apps/api (FastAPI/Python), apps/api-go (Go), apps/api-nest (NestJS).
---

# Skill: crear / extender APIs hexagonales

Este repo tiene tres APIs de referencia con la misma arquitectura en distintos
lenguajes. Esta skill hace cumplir esa arquitectura para todo código nuevo.

## Lee primero (fuente de verdad)

Antes de generar archivos, lee EN ORDEN:

1. `docs/architecture/README.md` — teoría compartida y decisiones cross-cutting.
2. `docs/architecture/<app>.md` — guía específica de la app objetivo (`api`, `api-go` o `api-nest`).
3. `docs/patterns.md` — patrones aplicados, con secciones "Cuándo NO usar".
4. `.claude/agents/architecture-guardian.md` — reglas que el guardian valida.

Si el usuario NO dijo qué app, **PREGUNTA antes de generar** (con
`AskUserQuestion`). No asumas.

## Forma del cambio (pregunta si no es claro)

1. **Agregar un caso de uso** (lo más común). Una nueva operación de negocio.
   → Command DTO + clase del use case + (opcional) nuevo port + cableado en el
   application service + endpoint HTTP + tests.
2. **Agregar un port + adapter** (sistema externo nuevo, ej. otro proveedor de IA).
   → Definir el port en `domain/ports/outbound/`, escribir el **stub** (siempre
   antes que el real), registrar en el composition root, dejar el adapter real
   para un follow-up.
3. **Scaffold de una API nueva en otro lenguaje** (Rust, Kotlin, …).
   → Espeja la estructura de las tres existentes; no inventes layout.

## Reglas duras (las hace cumplir el guardian)

1. **El dominio no tiene dependencias externas.** Ni HTTP frameworks, ni
   drivers de BD, ni SDKs. Excepción única: `@Injectable`/`@Inject` de NestJS
   (son metadata).
2. **Los use cases dependen de PORTS, nunca de adapters.** Si un use case
   importa de `adapters/`, rompiste la regla.
3. **El cableado vive SOLO en el composition root.** `Container` (Py/Go) o
   `PortsModule` (Nest) es el único sitio que conoce los concretos.
4. **Los stubs son first-class.** Cada port nuevo tiene su stub antes (o a la
   vez) que el real, para que dev/tests sigan corriendo con `USE_STUBS=true`.
5. **Los errores viajan como `DomainError` y se mapean a HTTP en el borde.** Los
   use cases lanzan `NotFoundError` / `ValidationError` / `InvalidStateError`;
   el filter (Nest), el `writeError` (Go) o el `HTTPException` mapper (Python)
   los traducen. Nunca lanzar `HttpException`/`HTTPException` desde el dominio.
6. **El wire es snake_case** (DTOs de request, mappers de respuesta). El modelo
   interno usa el casing idiomático del lenguaje.

## Ubicación por capa (universal)

| Qué | Dónde (Python · Go · Nest) |
|---|---|
| Entidad / value object | `domain/models/` · `internal/domain/model/` · `src/domain/models/` |
| Error de dominio | `LookupError`/`ValueError` (Py) · `internal/domain/model/errors.go` (Go) · `src/domain/errors/domain.errors.ts` (Nest) |
| Port | `domain/ports/outbound/` · `internal/domain/port/outbound.go` · `src/domain/ports/*.port.ts` (+ `Symbol` token) |
| Use case + command | `domain/use_cases/` · `internal/domain/usecase/` · `src/domain/use-cases/` |
| Application service (facade) | `application/` (todos) |
| Controller / router | `adapters/inbound/http/routers/` · `internal/adapter/inbound/http/` · `src/adapters/inbound/http/controllers/` |
| DTO + mapper de respuesta | `…/http/schemas/` (Py) · `…/http/dto.go` (Go) · `…/http/dto/` + `mappers/` (Nest) |
| Outbound adapter (stub + real) | `adapters/outbound/` |
| Composition root | `infrastructure/container.py` · `internal/infrastructure/container.go` · `src/infrastructure/ports.module.ts` |

## Convenciones por lenguaje

### apps/api (Python)
- Ports como `ABC` + `@abstractmethod`, prefijo `I` (`ICampaignRepository`).
- Entidades `@dataclass` con `from __future__ import annotations`.
- Use cases: `class XxxUseCase` con `async def execute(self, cmd)`.
- Commands `@dataclass`. `StrEnum` para tipos enumerados.
- Tests: pytest en `apps/api/tests/`, `asyncio_mode=auto`.
- Verificar: `cd apps/api && USE_STUBS=true pytest -q`.

### apps/api-go (Go)
- Ports como interfaces (SIN prefijo `I`) en `internal/domain/port/outbound.go`.
- Use cases: `type XxxUseCase struct` + `NewXxxUseCase(...)` + `Execute(ctx, cmd)`.
- `context.Context` en TODOS los métodos de port.
- Sentinel errors en `errors.go`, envueltos con `%w`, comparados con `errors.Is`.
- Verificar la regla de dependencias mecánicamente:
  ```
  go list -deps ./internal/domain/... | grep -E 'internal/(adapter|application|infrastructure)'
  ```
  Cualquier salida = violación.
- Tests: `cd apps/api-go && go test -race ./...`.

### apps/api-nest (NestJS)
- Cada port: interface TS **+ `Symbol` token** en el mismo archivo
  `src/domain/ports/*.port.ts` (las interfaces se borran en runtime; el Symbol
  es la llave de DI).
- Use cases: clases `@Injectable()` con constructor `@Inject(TOKEN)`.
- DTOs con `class-validator` (`@IsString`, `@Length`, `@IsIn`, …) y propiedades
  en **snake_case**.
- Errores: subclases de `DomainError`. NUNCA `HttpException` desde un use case.
- Cableado en `src/infrastructure/ports.module.ts` (`@Global()`).
- Tests: `cd apps/api-nest && pnpm test && pnpm test:e2e`.

## Recipe: agregar un caso de uso

1. **Lee primero los use cases existentes en la app objetivo** para copiar el
   estilo exacto. No improvises.
2. Crea el Command DTO con los campos de entrada.
3. Crea la clase del use case con los ports que necesite por constructor.
4. Si el use case necesita un port nuevo:
   - Define la interface en `domain/ports/outbound/` (con su `Symbol` token en Nest).
   - Escribe el **stub** in-memory en `adapters/outbound/stub*`.
   - Registra el binding en el composition root.
5. Cablea el use case en el application service correspondiente
   (`campaigns_service` / `inspiration_service`).
6. Expone vía HTTP: método en el controller con su DTO + mapper de respuesta.
7. Test unitario del use case usando los stubs como fakes directos (sin tocar
   HTTP).
8. Si el endpoint es nuevo, extiende el smoke test E2E.

## Después de generar

SIEMPRE:

1. Corre los tests de la app afectada (comandos arriba por lenguaje).
2. Invoca el subagente `architecture-guardian` con los archivos tocados; si
   reporta violaciones de capa, **arregla antes de terminar**.
3. Si introdujiste un patrón nuevo (raro), actualiza `docs/patterns.md`.

## Cuándo preguntar primero

Usa `AskUserQuestion` si CUALQUIERA de estas no es clara desde el mensaje:

- ¿Qué app es el objetivo (python/go/nest)?
- ¿Es un use case nuevo en feature existente, o un bounded context nuevo?
- ¿La operación necesita un port nuevo, o bastan los existentes?
- ¿Tiene exposición HTTP, o solo se invoca desde un worker?
