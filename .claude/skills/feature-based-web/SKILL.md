---
name: feature-based-web
description: Build or extend a frontend using feature-based architecture with layers. Use when the user wants to add a new feature, a page, a component, a hook, or a service to any frontend app. Framework-agnostic — applies to React/Next.js, Angular, Vue, Svelte, SolidJS. Enforces "features never import other features" and the data/ui/pages split.
---

# Skill: feature-based frontend scaffold / extension

Universal rules + framework-agnostic recipe for frontends organized by feature.
Adapts to whatever conventions the target repo already has.

## Step 0 — Discover the project (always)

Before generating ANY file:

1. Look for existing architecture docs (`docs/architecture/*`, `ARCHITECTURE.md`,
   sections in `README.md`). If found, **read them — their conventions win**
   over anything in this skill.
2. Inspect the actual folder layout (`features/`? `modules/`? a flat
   `components/`?) and copy the EXACT shape an existing feature uses. Don't
   impose this skill's defaults if a different structure already exists.
3. Look for `.claude/agents/architecture-guardian.md` (or similar). If present,
   its rules are the source of truth.
4. If none of the above exist, use the defaults below.

If the target framework/app is ambiguous, ASK with `AskUserQuestion`.

## Universal layout (default when none exists)

```
src/
├── app/         routing + composition roots (one entry per route)
├── features/    each feature is autonomous:
│   └── <feature>/
│       ├── data/      facade exposing reactive state to components
│       ├── ui/        presentational components (props in, events out)
│       ├── pages/     routed smart components — inject the facade
│       └── domain/    pure feature logic (builders, schemas) — optional
├── shared/      genuinely shared UI, helpers, types (used by ≥2 features)
└── core/        client-side infrastructure: API client, interceptors,
                 DI tokens. (Angular-style; for React/Vue this commonly
                 lives in shared/lib/.)
```

## The four hard rules (universal, always enforce)

1. **A feature NEVER imports from another feature.** `features/a/` importing
   from `features/b/` is a violation. If two features need the same thing,
   it belongs in `shared/`. When a flow genuinely crosses features (e.g. a
   multi-step wizard), composition happens **at the route** — the page is
   the composition root, not a component inside a feature.
2. **`shared/` and `core/` never import from `features/`.** Dependencies flow
   `app → features → shared/core`, never backward.
3. **Components in `ui/` are presentational only.** No injected services, no
   API calls, no global state — only props/inputs and emitted events. Use
   `OnPush`/memoization where the framework offers it.
4. **Only the feature's `data/` layer calls the API client.** Pages and `ui/`
   components talk to the facade, never to `fetch`/`HttpClient`/`axios`
   directly.

## Universal recipe: add a feature

1. **Read an existing feature** in the target codebase to copy its exact shape.
2. Create the feature folder skeleton: `data/`, `ui/`, `pages/`, optionally
   `domain/` and `types.ts`.
3. Build the **facade** in `data/`:
   - Holds state (signals / observables / query hooks — match framework idiom).
   - Calls the API client; never `fetch` directly.
   - Exposes reactive state that components subscribe to.
4. Build **presentational** components in `ui/`: receive data via props/inputs,
   emit events. No services injected.
5. Build the routed **container** in `pages/`: injects the facade, passes data
   down, handles navigation.
6. Add a lazy route in the app's router config.
7. If the API surface changes, extend the shared API client + DTO types.

## Framework-specific idioms

### React / Next.js (App Router)
- **Server Components by default.** Mark `"use client"` only when the file
  uses hooks, state, or events.
- **Mutations via Server Actions** validated with Zod (Next.js) or via a
  TanStack mutation hook (React Router / Remix).
- **Reads via TanStack Query / SWR** hooks; the facade is a small wrapper.
- **Polling**: `refetchInterval: q => terminal ? false : 2000`.
- File naming: `kebab-case.tsx` for components, `useXxx.ts` for hooks.

### Angular (17+)
- **Standalone components**, `ChangeDetectionStrategy.OnPush`, no NgModules.
- **Signals everywhere**: `signal`, `computed`, `effect`, `input()`, `output()`.
- **New control flow**: `@if`, `@for (… ; track …)`. Do NOT use `*ngIf`/
  `*ngFor` in new code.
- **Reactive Forms** with `NonNullableFormBuilder`.
- **Optimistic UI** in facades (set signal locally, revert on error).
- **Polling**: RxJS `interval` + `switchMap` + `takeWhile(...; true)` → poured
  into a signal.

### Vue 3
- **Composition API**, `<script setup>`.
- Facade as a composable, or a Pinia store (`defineStore`).
- `ref`/`reactive` for state; `computed` for derivations.

### Svelte / SvelteKit
- Facade as a `writable` store or a runes-based class.
- Presentational components consume props and emit events
  (`createEventDispatcher`).

### SolidJS
- Facade as a context provider with signals.
- Presentational components are plain functions taking props.

## Smart vs presentational — quick decision

| Need | Goes in |
|---|---|
| Reads/writes backend data | `pages/` (smart, injects the facade) |
| Receives data via props/inputs, emits events | `ui/` (presentational) |
| Has its own route | router config + a `pages/` component |
| Used by ≥ 2 features | `shared/components/` |

## After generating

Always:

1. Run the project's build + typecheck for the affected app.
2. If `.claude/agents/architecture-guardian.md` (or similar) exists, invoke
   that subagent with the touched files. Fix any cross-feature imports or
   layer violations before finishing.
3. If a `playwright-e2e` (or similar E2E) subagent exists and you added a UI
   flow, invoke it to cover the new path.

## When to ASK first

Use `AskUserQuestion` if ANY of these is unclear:

- Which app/folder is the target?
- Framework (React/Next, Angular, Vue, Svelte, …)?
- New feature folder, or extension of an existing one?
- Does the backend surface change (new endpoint), or only consume existing ones?
- Does the new flow cross features (composition root needed at the route)?
