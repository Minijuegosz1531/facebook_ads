---
name: hexagonal-api
description: Build or extend a backend API using the Hexagonal (Ports & Adapters) architecture. Use when the user wants to add a use case, a new port + adapter, an HTTP endpoint, or scaffold a brand-new hexagonal API. Language-agnostic — applies to Python (FastAPI/Flask), Go, NestJS/TypeScript, Java/Kotlin (Spring), Rust (Axum), etc.
---

# Skill: hexagonal API scaffold / extension

Universal rules + framework-agnostic recipe for backends that follow Hexagonal
(Ports & Adapters). Adapts to whatever conventions the target repo already has.

## Step 0 — Discover the project (always)

Before generating ANY file:

1. Look for existing architecture docs (`docs/architecture/*`, `ARCHITECTURE.md`,
   `README.md` sections). If found, **read them — their conventions win** over
   anything in this skill.
2. Look at one or more existing components in the target codebase (an existing
   use case, controller, adapter) and copy the **exact** file naming, casing,
   import style and folder layout. Never invent a layout when one already exists.
3. Look for `.claude/agents/architecture-guardian.md` (or similar). If present,
   its rules are the source of truth — this skill's defaults are subordinate.
4. If NONE of the above exist, use the defaults below.

If the target language/app/folder is ambiguous from the user's message, ASK with
`AskUserQuestion` before generating.

## Universal layout (default when none exists)

```
src/  (or internal/ in Go, the package root in Python/Java)
├── domain/
│   ├── models/       pure entities (data + behavior, no IO)
│   ├── ports/        interfaces the domain NEEDS from the outside
│   ├── use_cases/    business logic — orchestrates ports
│   └── errors/       domain error hierarchy
├── application/      services (facades) that group use cases
├── adapters/
│   ├── inbound/      HTTP controllers, workers — translate the world to the domain
│   └── outbound/     concrete implementations of the ports (DB, SDKs, queues)
└── infrastructure/   composition root: wires concrete adapters to ports
```

Folder names vary by ecosystem convention. **Match what the project uses.** If
nothing exists, use the names above.

## The six hard rules (universal, always enforce)

1. **The domain has zero external dependencies.** No HTTP frameworks, DB
   drivers, SDKs, or any package outside the standard library inside `domain/`.
   The only acceptable exception is lightweight DI-marker decorators (NestJS
   `@Injectable`/`@Inject`, Spring `@Component` when used purely as metadata).
2. **Use cases depend on ports, never on adapters.** A use case importing a
   concrete class from `adapters/` is a violation.
3. **Wiring lives ONLY in the composition root** (`Container`, `PortsModule`,
   `main.<lang>`, Spring `@Configuration`, whatever the project calls its DI
   factory). It is the single place that decides which concrete implements
   which port.
4. **Stubs/fakes are first-class, not test-only.** Every port has an in-memory
   implementation living alongside the real one, so dev runs and tests work
   with zero external dependencies.
5. **Errors travel as domain types and are mapped to transport at the edge.**
   Use cases raise `NotFoundError` / `ValidationError` / `InvalidStateError`
   (or the project's equivalents); the inbound adapter translates them to HTTP
   status codes in ONE place. Never raise `HttpException`/`HTTPException` from
   inside the domain.
6. **Wire format is stable and explicit.** Pick one (usually `snake_case` for
   REST) and translate to/from internal naming at the inbound DTO boundary, in
   one place. Internal models stay in the language's idiomatic casing.

## Universal recipe: add a use case

1. **Read an existing use case** in the target codebase to copy its style.
2. Define the Command DTO with the use case's input fields.
3. Define the use case class/function with the ports it needs as constructor
   parameters (or function args — match the project's idiom).
4. If a new port is needed:
   - Define the interface under `domain/ports/`.
   - Write the **stub/in-memory adapter** under `adapters/outbound/stub/`
     (or the project's equivalent).
   - Register the binding in the composition root.
5. Wire the use case into the appropriate application service.
6. Expose via an inbound adapter (HTTP controller, worker, CLI) — DTO in,
   mapped response out.
7. Add a unit test of the use case using stubs as fakes (no framework needed).
8. Add or extend an E2E smoke test if a new endpoint was exposed.

## Language-specific idioms

These are universal language idioms, not repo-specific. Apply the one that
matches the target.

### Python (FastAPI, Flask, Litestar, …)
- Ports: `abc.ABC` + `@abstractmethod` (or `typing.Protocol` for structural).
  Convention: prefix `I` (`IRepository`) or no prefix — match the project.
- Entities: `@dataclass`. `pydantic.BaseModel` ONLY at the inbound boundary.
- Use cases: `class XxxUseCase` with `async def execute(self, cmd)`.
- Stubs: in-memory classes side-by-side with real adapters.

### Go
- Ports: interfaces (no `I` prefix — Go convention). Satisfied implicitly.
- `context.Context` as the first parameter of every port method.
- Sentinel errors via `errors.New` + wrap with `%w`; match with `errors.Is`.
- Use cases: `type XxxUseCase struct` + `NewXxxUseCase(...)` + `Execute(ctx, cmd)`.
- Verify dependency direction mechanically:
  `go list -deps ./internal/domain/... | grep -E 'internal/(adapter|application|infrastructure)'`
  must return nothing.

### NestJS / TypeScript
- Each port: TS interface + `Symbol` token in the same file. Interfaces erase
  at runtime; the Symbol is the DI key.
- Use cases: `@Injectable()` classes with constructor `@Inject(TOKEN)`.
- DTOs use `class-validator` decorators (`@IsString`, `@Length`, `@IsIn`, …).
- Errors: subclasses of a `DomainError`, mapped by ONE `ExceptionFilter`.
- Composition root: a `@Global()` module with `useClass`/`useFactory` providers.

### Java / Kotlin (Spring, Quarkus, Micronaut)
- Ports: interfaces in the `domain` package, no framework annotations.
- Use cases: classes with constructor injection. Framework annotations
  (`@Service`, `@Component`) ONLY in the application layer, not in `domain/`.
- Domain errors as a sealed hierarchy; map with `@ControllerAdvice` /
  `ExceptionMapper`.

### Rust (Axum, Actix, Rocket)
- Ports as `trait`s in `domain/ports/`.
- Use cases as plain structs holding `Arc<dyn Trait>` ports.
- Errors as `enum`s with `thiserror::Error`; mapped to HTTP at the handler.

## After generating

Always:

1. Run the project's test suite for the affected area.
2. If `.claude/agents/architecture-guardian.md` (or similar) exists, invoke
   that subagent with the touched files. Fix any reported layer violations
   before finishing.
3. If you ADOPTED new conventions (no doc existed at step 0), propose a brief
   ADR under `docs/architecture/` describing what you chose and why.

## When to ASK first

Use `AskUserQuestion` if ANY of these is unclear from the user's message:

- Which app/folder is the target?
- Language and framework?
- New use case in an existing bounded context, or a new bounded context?
- Does the operation need a new outbound port, or do existing ones suffice?
- HTTP exposure expected, or internal-only (worker, CLI, library)?
