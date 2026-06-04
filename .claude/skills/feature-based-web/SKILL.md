---
name: feature-based-web
description: Crea o extiende un frontend siguiendo la arquitectura feature-based documentada en el repo. Úsala cuando el usuario quiera agregar una feature nueva, una página, un componente o un hook a apps/web (Next.js) o apps/web-angular (Angular). Hace cumplir "las features nunca se importan entre sí" y el layout data/ui/pages.
---

# Skill: crear / extender frontends feature-based

Este repo tiene dos frontends de referencia con la misma forma modular en
distintos frameworks:

- `apps/web` — Next.js 16 · App Router · Server Components · Server Actions · TanStack Query · Zod 4.
- `apps/web-angular` — Angular 20 · standalone · signals · Reactive Forms.

Esta skill hace cumplir esa arquitectura para todo código nuevo.

## Lee primero (fuente de verdad)

Antes de generar archivos, lee EN ORDEN:

1. `docs/architecture/README.md` — teoría compartida.
2. `docs/architecture/web.md` o `docs/architecture/web-angular.md` — guía
   específica de la app objetivo.
3. `docs/patterns.md` — patrones aplicados, con secciones "Cuándo NO usar".
4. `.claude/agents/architecture-guardian.md` — reglas que el guardian valida.

Si el usuario NO dijo qué app, **PREGUNTA antes de generar**
(`AskUserQuestion`). No asumas.

## Reglas duras (las hace cumplir el guardian)

1. **Una feature NUNCA importa de otra feature.** `features/campaigns/**` no
   puede importar de `features/inspiration/**` (ni viceversa). Si dos features
   necesitan lo mismo, sube a `shared/`. Cuando un flujo cruza features (p. ej.
   el wizard de nueva campaña), la composición ocurre en la **ruta** — la
   página es el composition root, no un componente de feature.
2. **`shared/` y `core/` nunca importan de `features/`.** Las dependencias
   fluyen `app → features → shared/core`, jamás al revés.
3. **Componentes en `ui/` son presentacionales.** Sin servicios inyectados;
   solo `input()`/`output()` (Angular) o props/callbacks (React). `OnPush` en
   Angular.
4. **Solo el `data/` (o `hooks/`/`actions/`) de la feature llama al API
   client.** Páginas y `ui/` hablan con la facade, nunca con
   `HttpClient`/`fetch` directamente.

## Forma del cambio (pregunta si no es claro)

1. **Feature nueva** (lo más común). Recurso/flujo nuevo.
   → Crear la carpeta de la feature con su subestructura; cablear la ruta en `app/`.
2. **Componente nuevo en feature existente.**
   → Decidir presentacional (`ui/`) vs container (`pages/`); actualizar
   consumidores.
3. **Scaffold de un frontend nuevo en otro framework** (Svelte, Solid, …).
   → Espeja la estructura existente; no inventes layout.

## Ubicación por capa

### apps/web (Next.js)

| Subcarpeta | Qué contiene |
|---|---|
| `app/(dashboard)/<f>/page.tsx` | Server Component fino que renderiza el container de la feature |
| `app/api/<f>/route.ts` | Route Handler (proxy a la API real, o mock con `MOCK_API=1`) |
| `features/<f>/components/` | Client components (los con `"use client"`) |
| `features/<f>/hooks/` | TanStack Query hooks (`useXxx`) |
| `features/<f>/actions/` | Server Actions (`"use server"`) validadas con Zod |
| `features/<f>/schemas/` | Schemas Zod |
| `features/<f>/types.ts` | Tipos de la feature; puede re-exportar de `shared/types/api.ts` |
| `shared/lib/backend/{mock,http}.ts` | Selecciona mock vs http (server-only) |
| `shared/lib/api-client.ts` | Fetcher cliente hacia `/api/*` |

Composition root para flujos multi-feature: una **page** con `"use client"` en
`app/(dashboard)/.../page.tsx` (ej. `app/(dashboard)/campaigns/new/page.tsx`).

### apps/web-angular (Angular)

| Subcarpeta | Qué contiene |
|---|---|
| `src/app/features/<f>/data/<f>.service.ts` | `@Injectable({ providedIn: 'root' })` facade con **signals** |
| `src/app/features/<f>/ui/<name>.ts` | Standalone presentacional, `OnPush`, `input()`/`output()` |
| `src/app/features/<f>/pages/<name>-page.ts` | Container (smart) — inyecta la facade |
| `src/app/features/<f>/domain/` | Lógica pura (builders, schemas) cuando aporta |
| `src/app/features/<f>/types.ts` | Re-export de `shared/models/api.models.ts` |
| `src/app/core/api/api-client.ts` | Adapter sobre `HttpClient` — único sitio que conoce endpoints |
| `src/app/core/interceptors/` | Interceptores funcionales (base URL, errores) |
| `src/app/app.routes.ts` | `loadComponent` lazy por ruta |

Composition root para flujos multi-feature: una **routed page** en
`features/<owning-feature>/pages/` (ej. `features/campaigns/pages/new-campaign-page.ts`).

## Convenciones por framework

### Next.js
- **Server Components por default.** Marca `"use client"` solo cuando hay
  hooks/estado/eventos.
- **Mutaciones vía Server Actions + Zod**: validar, llamar `backend.*`,
  `revalidatePath(...)`.
- **Lecturas vía TanStack Query** hits a `/api/*` con `useQuery`.
- **Polling**: `refetchInterval: q => terminal ? false : 2000`.
- File naming: `kebab-case.tsx` para componentes, `useXxx.ts` para hooks,
  `xxx.schema.ts` para Zod.

### Angular
- **Standalone components**, `ChangeDetectionStrategy.OnPush`, sin NgModules.
- **Signals everywhere**: `signal`, `computed`, `effect`, `input()`, `output()`.
- **Nuevo control flow**: `@if`, `@for (… ; track …)`. NO `*ngIf`/`*ngFor`.
- **Polling**: RxJS `interval` + `switchMap` + `takeWhile(...; true)` →
  vuelca en `signal`.
- **Reactive Forms** con `NonNullableFormBuilder` + `Validators`.
- **Optimistic UI** en facades (set signal local, revertir en `error`).
- File naming (Angular 20): sin sufijo `.component` ni `.service` cuando se
  puede inferir del path — `client-selector.ts`, `clients.service.ts` ok.

## Recipe: agregar una feature

### Next.js
1. Crea el esqueleto:
   - `features/<f>/components/<List|Form|Detail>.tsx`
   - `features/<f>/hooks/use<F>.ts`
   - `features/<f>/actions/<create|update>.ts` (`"use server"`)
   - `features/<f>/schemas/<f>.schema.ts`
   - `features/<f>/types.ts`
2. Ruta en `app/(dashboard)/<f>/page.tsx` (Server Component renderiza un
   componente de `features/<f>/components/`).
3. Si la superficie HTTP es nueva:
   - Añade route handlers en `app/api/<f>/route.ts`.
   - Extiende `shared/lib/backend/types.ts`, `mock.ts`, `http.ts`.
4. Tipos wire en `shared/types/api.ts` si es nuevo.
5. Verifica con `pnpm build && pnpm typecheck`.
6. Si añadiste flujo UI, considera un spec Playwright en `e2e/`.

### Angular
1. Crea el esqueleto:
   - `src/app/features/<f>/data/<f>.service.ts` (`providedIn: 'root'`, signals)
   - `src/app/features/<f>/ui/<name>.ts` (presentacional)
   - `src/app/features/<f>/pages/<f>-page.ts` (smart)
   - `src/app/features/<f>/types.ts`
2. Si hay endpoint nuevo, extiende `src/app/core/api/api-client.ts` con un
   método tipado.
3. Lazy route en `src/app/app.routes.ts`:
   ```ts
   { path: '<f>', loadComponent: () => import('./features/<f>/pages/<f>-page').then(m => m.<F>Page) }
   ```
4. Modelo wire en `src/app/shared/models/api.models.ts` si es nuevo.
5. Verifica con `pnpm build` y `pnpm typecheck` (TypeScript estricto).

## Decisión rápida: presentacional vs container

| Necesidad | Va en |
|---|---|
| Lee/escribe datos del backend | `pages/` (container, inyecta la facade) |
| Recibe datos por props/inputs, emite eventos | `ui/` (presentacional) |
| Tiene routing | `app/...` (Next) o `pages/` (Angular, registrado en `app.routes.ts`) |
| Lo usan ≥2 features | `shared/components/` |

## Después de generar

SIEMPRE:

1. Corre `pnpm build` (y `pnpm typecheck` para Angular) en la app afectada.
2. Invoca el subagente `architecture-guardian` con los archivos tocados; si
   reporta cross-feature imports o lógica de negocio en `app/`, **arregla antes
   de terminar**.
3. Si añadiste un flujo UI en `apps/web` y existen Playwright tests, invoca el
   subagente `playwright-e2e` para cubrir el flujo nuevo.

## Cuándo preguntar primero

Usa `AskUserQuestion` si CUALQUIERA no es clara:

- ¿Qué app (web/web-angular)?
- ¿Feature nueva, o extensión de una existente?
- ¿La superficie HTTP cambia (endpoint nuevo) o solo consume los existentes?
- ¿El flujo cruza features (necesita composition root en la ruta)?
