# Arquitectura — índice

Guías por app. Cada documento explica **qué hace cada capa, qué contiene, por
qué existe y dónde está** en esa app concreta, anclado a rutas de archivo.

| App | Stack | Documento |
|---|---|---|
| `apps/api` | FastAPI · Python 3.13 | [api.md](api.md) |
| `apps/api-go` | Go 1.24 · stdlib | [api-go.md](api-go.md) |
| `apps/api-nest` | NestJS 11 · TypeScript | [api-nest.md](api-nest.md) |
| `apps/web` | Next.js 16 · React 19 | [web.md](web.md) |
| `apps/web-angular` | Angular 20 · signals | [web-angular.md](web-angular.md) |

Para los **patrones de diseño concretos** aplicados en el código (Builder,
Adapter, Facade, Observer, …) con sus rutas exactas, ver
[`../patterns.md`](../patterns.md).

---

## Las dos arquitecturas del repo

### Hexagonal (Ports & Adapters) — para las 3 APIs

La regla absoluta: **las dependencias siempre apuntan hacia adentro.**

```
Composition Root (Container / Module)
        │
        ▼
┌─────────────────────────────────────────────┐
│  Adapters INBOUND        Adapters OUTBOUND  │
│  (HTTP, workers)         (BD, SDKs, APIs)   │
└──────────────┬───────────────────┬──────────┘
               │                   │ implementan
               ▼                   ▼
        ┌──────────────────────────────┐
        │  Application services        │
        └──────────────┬───────────────┘
                       ▼
        ┌──────────────────────────────┐
        │  Dominio: entidades · ports  │
        │           use cases · errores│
        └──────────────────────────────┘
```

Tres consecuencias:

1. El **dominio se testea** sin BD, HTTP ni SDKs — solo fakes que cumplen ports.
2. **Cambiar un proveedor** es un nuevo adapter + una línea en el composition
   root.
3. Los frameworks (FastAPI, Nest, gin) cambian rápido; el dominio cambia
   despacio. Aislarlos te ahorra reescrituras.

### Feature-based con capas — para los frontends

```
app/        → routing y composición de ruta (composition root del frontend)
features/   → campaigns/, inspiration/, clients/ — autónomas
shared/     → genuinamente compartido (UI, helpers, tipos)
core/       → singletons transversales (solo Angular)
```

**Regla absoluta**: una feature **nunca** importa de otra feature. Si dos
features necesitan algo, sube a `shared/`. Si un flujo cruza features (p. ej.
el wizard de nueva campaña), la composición ocurre **en la ruta**, no dentro de
una feature.

---

## Decisiones cross-cutting (las "por qué" globales)

### Stubs first-class (no son tests, son producción del modo dev)

Cada port tiene su stub en `adapters/outbound/stub/`. Un `pnpm start:dev` o
`go run ./cmd/api` arranca con stubs y responde 100% del API real — sin
Postgres, Redis, ni credenciales.

- **Onboarding en 60 segundos**: clonar, instalar, correr.
- **Tests E2E corren contra el mismo binario que dev** — no hay un "modo test"
  paralelo que diverja en silencio.
- **El frontend se desarrolla contra API real** (no mocks de fetch), con shapes
  idénticos a producción.

### snake_case en el wire, camelCase internamente

DTOs y mappers HTTP usan `snake_case`. El código interno usa `camelCase`. La
traducción ocurre **una sola vez** en el mapper inbound/outbound.

- Compatibilidad con el SDK de Meta y la convención REST predominante.
- Las 3 APIs son **intercambiables** tras el mismo frontend.

### Un único System User Token de Meta

Todas las cuentas clientes están bajo un mismo Business Manager. Mantener un
token por cliente añade gestión (rotación, expiración) sin beneficio de
seguridad en este modelo. El modelo de datos contempla `agencyId` cuando llegue
el momento de tenerlos múltiples (Nivel 2 de escalabilidad).

### Redis para estado de jobs, Postgres para datos persistentes

Los jobs de inspiración tienen ciclo de vida corto (minutos) y se leen por
polling cada 2 s. Redis soporta este patrón con latencia <1 ms; Postgres
generaría carga innecesaria.

### Tres APIs y dos frontends en el mismo repo

No es over-engineering: es **material de estudio**. Ver hexagonal en Python
(ABCs), Go (interfaces implícitas) y NestJS (DI por símbolo) enseña que **la
arquitectura no depende del lenguaje**. Igual con feature-based en Next.js (RSC
+ Server Actions) y Angular (signals + standalone).

---

## Cómo decidir cuándo introducir una capa

Empieza simple. **Las capas se ganan, no se asumen.**

| Síntoma que ves | Qué agregar |
|---|---|
| "Quiero testear esto sin levantar BD" | Repository port + stub |
| "Esta lógica ya la usé en dos handlers" | Use case |
| "Mi controller tiene 6 dependencias" | Application service (facade) |
| "`try/catch` para mapear errores en cada handler" | Exception filter / middleware |
| "Necesito correr en otro entorno con otra BD/SDK" | Composition root explícito |
| "Cambia la API externa y rompen tests del dominio" | Outbound adapter |
| "Mi componente hace fetch en `useEffect`" | Facade en `data/` |
| "Dos componentes idénticos en distintas features" | Subir a `shared/` (solo si son **idénticos**) |

**Anti-señal**: agregar una capa "por si acaso". Cada capa pesa — indirección,
archivos, complejidad mental. Págala cuando el dolor que cura ya apareció.
