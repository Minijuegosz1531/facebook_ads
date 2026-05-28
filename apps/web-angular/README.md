# Meta Ads Platform — frontend en Angular 20

Reimplementación del frontend (`apps/web`, Next.js) en **Angular 20**, pensada
como material de estudio: standalone components, **signals**, nuevo control flow
(`@if` / `@for`), Reactive Forms, lazy loading y varios patrones de diseño
señalados y comentados en el código.

Consume el **mismo microservicio** que las demás apps (FastAPI `apps/api` o Go
`apps/api-go`) a través del **proxy de desarrollo de Angular** — no hay mock.

## Correr

```bash
cd apps/web-angular
pnpm install

# 1) Levanta el backend (elige uno):
#    Python:  (cd ../api    && USE_STUBS=true uvicorn main:app --port 8000)
#    Go:      (cd ../api-go && ADDR=:8000 go run ./cmd/api)

# 2) Levanta Angular (proxy → http://localhost:8000):
pnpm start                       # http://localhost:4200

pnpm build                       # build de producción
```

El proxy está en `proxy.conf.json`: reescribe `/api/*` → `http://localhost:8000/*`.
Para apuntar al Go API en otro puerto, cambia el `target` ahí.

## Arquitectura (feature-based con capas)

```
src/app/
├── app.ts / app.config.ts / app.routes.ts   # bootstrap, providers, rutas
├── core/                                     # singletons transversales
│   ├── api/        api-client.ts (Adapter)  · api-config.ts (InjectionToken)
│   ├── interceptors/  base-url · error (interceptores funcionales)
│   └── notifications/ notification.service.ts (Observer con signals)
├── shared/                                   # reutilizable y presentacional
│   ├── models/  api.models.ts (DTOs)
│   ├── components/ status-badge · toast
│   └── pipes/   budget.pipe.ts
├── features/                                 # cada feature es autónoma
│   ├── clients/      data/ (facade) · ui/ · pages/
│   ├── inspiration/  data/ (facade+polling) · ui/
│   └── campaigns/     data/ (facade) · domain/ (Builder) · ui/ · pages/
└── layout/  dashboard-layout.ts (shell + router-outlet)
```

**Regla de imports** (igual que la app Next.js): una feature **no** importa de
otra. Cuando un flujo cruza features (el wizard de nueva campaña necesita
clients + inspiration + campaigns), la composición ocurre en la **página de la
ruta** (`features/campaigns/pages/new-campaign-page.ts`), el composition root.

## Patrones de diseño en el código (para estudiar)

- **Adapter / Gateway** — `core/api/api-client.ts`: envuelve `HttpClient` en una
  API tipada que habla el dominio (clients, campaigns, jobs). Emite paths
  relativos; el host lo resuelve el interceptor.
- **Chain of Responsibility** — interceptores funcionales
  (`core/interceptors/`): `baseUrl` antepone `/api`, `error` normaliza los
  errores del backend. Se componen en `provideHttpClient(withInterceptors([...]))`.
- **Facade + Store reactivo** — `features/*/data/*.service.ts`: ocultan el
  ApiClient y el async detrás de **signals**; los componentes leen `clients()`,
  `list()`, `job()` y se actualizan solos.
- **Observer (signals + RxJS)** — `notification.service.ts` (signal compartido
  entre el interceptor productor y el `toast` consumidor) y el **polling** de
  inspiración (`interval` + `switchMap` + `takeWhile`) en `inspiration.service.ts`.
- **Builder** — `features/campaigns/domain/publish-request.builder.ts`: arma el
  payload de publicación desde tres fuentes (cliente, formulario, selección) con
  pasos fluidos y valida en `build()`.
- **Container / Presentational** — las `pages/` son "smart" (inyectan facades);
  los componentes de `ui/` son presentacionales puros (`input()` / `output()`).
- **Reactive Forms** — `campaign-form.ts`: FormGroup tipado con validadores
  declarativos vía `NonNullableFormBuilder`.
- **Dependency Injection** — `inject()` en todos lados; `API_BASE_PATH` como
  `InjectionToken` configurable; servicios `providedIn: 'root'` (singletons).
- **Pipe (Strategy de formato)** — `budget.pipe.ts` formatea centavos a moneda.

## Idiomas de Angular 20 que se ven aquí

- **Standalone components** (sin NgModules) — el default en Angular 20.
- **Signals**: `signal`, `computed`, `input()`, `output()`, `effect()`.
- **Nuevo control flow** en plantillas: `@if`, `@for (… ; track …)`.
- **OnPush** en todos los componentes (encaja natural con signals).
- **Functional HTTP interceptors** (`HttpInterceptorFn`).
- **`withComponentInputBinding()`**: el param de ruta `:id` llega como `input()`
  en `campaign-detail-page.ts`, y un `effect` recarga al cambiar.
- **Lazy loading** por ruta con `loadComponent` (code-splitting; ver los chunks
  en `pnpm build`).

## Mapeo Next.js ⇄ Angular

| Next.js (`apps/web`) | Angular (`apps/web-angular`) |
|---|---|
| TanStack Query hooks | Facade service + signals |
| Server Actions | métodos del facade que llaman al ApiClient |
| API routes (proxy/mock) | proxy de Angular (`proxy.conf.json`) al backend real |
| `fetch` + `api-client.ts` | `HttpClient` + `ApiClient` (Adapter) + interceptores |
| feature folders | feature folders (misma regla: no cruzar features) |
| Zod schema | Reactive Forms + `Validators` |
