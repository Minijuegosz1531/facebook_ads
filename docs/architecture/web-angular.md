# `apps/web-angular` — Angular 20 · signals

Reimplementación del frontend en Angular 20 con standalone components, signals
y nuevo control flow. Misma arquitectura **feature-based con capas** que
`apps/web`. Consume el microservicio (Python, Go o Nest) a través del **proxy
de desarrollo de Angular** — sin mock.

Para los patrones concretos del código, ver [`../patterns.md`](../patterns.md).
Para la teoría compartida, [`README.md`](README.md).

---

## Stack

| Pieza | Tecnología |
|---|---|
| Framework | Angular 20.3 (standalone, `provideZoneChangeDetection`) |
| Estado | Angular signals (`signal`, `computed`, `effect`, `input()`, `output()`) |
| HTTP | `HttpClient` con interceptores funcionales |
| Forms | Reactive Forms (`NonNullableFormBuilder`) |
| Async streams | RxJS 7.8 (polling: `interval` + `switchMap` + `takeWhile`) |
| Styling | Tailwind 4 (via `@tailwindcss/postcss`) |
| Build | `@angular/build` (application builder con esbuild/vite) |

---

## Layout

```
apps/web-angular/
└── src/app/
    ├── app.ts                              # root: <router-outlet /> + <app-toast />
    ├── app.config.ts                       # providers globales (HTTP, Router, interceptors)
    ├── app.routes.ts                       # rutas con loadComponent (lazy)
    ├── core/                               # singletons transversales
    │   ├── api/
    │   │   ├── api-client.ts               # Adapter sobre HttpClient
    │   │   └── api-config.ts               # InjectionToken API_BASE_PATH
    │   ├── interceptors/
    │   │   ├── base-url.interceptor.ts     # prefija /api a paths relativos
    │   │   └── error.interceptor.ts        # normaliza errores → NotificationService
    │   └── notifications/notification.service.ts  # signal compartido
    ├── shared/
    │   ├── components/                     # StatusBadge, Toast, MetricCard
    │   ├── pipes/budget.pipe.ts            # cents → moneda
    │   └── models/api.models.ts            # DTOs wire (snake_case)
    ├── features/
    │   ├── clients/
    │   │   ├── data/clients.service.ts     # facade con signal de clientes
    │   │   ├── ui/client-selector.ts       # widget (smart) input/output
    │   │   └── pages/clients-page.ts
    │   ├── inspiration/
    │   │   ├── data/inspiration.service.ts # facade + polling RxJS
    │   │   ├── ui/{image-selector,copy-selector,asset-combiner,inspiration-loader}.ts
    │   │   └── hooks/useAssetSelection.ts  (no aplica — equivalente en signals dentro del wizard)
    │   └── campaigns/
    │       ├── data/campaigns.service.ts   # facade (list, current, insights, publish, updateStatus)
    │       ├── domain/publish-request.builder.ts  # Builder
    │       ├── ui/{campaign-list,campaign-form,ad-card,ad-preview}.ts
    │       └── pages/{campaigns-page,new-campaign-page,campaign-detail-page}.ts
    └── layout/dashboard-layout.ts          # shell con sidebar + router-outlet
```

---

## Capa por capa

### A. `core/` — singletons transversales

Esta capa no existe en Next.js (las route handlers cumplen el rol). En Angular,
`core/` agrupa **infraestructura del cliente**: el ApiClient, los interceptores,
y los servicios singleton que viven mientras vive la app.

#### `core/api/api-client.ts` — Adapter

Envuelve `HttpClient` con métodos tipados que hablan el dominio del backend:

```ts
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  listClients(): Observable<Client[]> { return this.http.get<Client[]>('clients'); }
  // ...
}
```

Emite paths **relativos** (`clients`, no `/api/clients`). El prefijo `/api` lo
añade el interceptor.

#### `core/api/api-config.ts` — InjectionToken

```ts
export const API_BASE_PATH = new InjectionToken<string>('API_BASE_PATH', {
  providedIn: 'root',
  factory: () => '/api',
});
```

Configuración inyectable: los tests pueden override sin tocar consumidores.

#### `core/interceptors/` — Chain of Responsibility

Dos interceptores funcionales (`HttpInterceptorFn`) en cadena:

1. **`baseUrlInterceptor`** — antepone `API_BASE_PATH` a paths relativos.
2. **`errorInterceptor`** — atrapa `HttpErrorResponse`, extrae `detail`,
   empuja al `NotificationService` (que el toast lee reactivamente).

Registrados en `app.config.ts`:

```ts
provideHttpClient(withInterceptors([baseUrlInterceptor, errorInterceptor]))
```

#### `core/notifications/notification.service.ts` — Observer con signal

Productor (interceptor) hace `notifications.error(detail)`; consumidor (toast
component) lee `notifications.items()` en su template. **El signal es el subject
compartido** — ninguna referencia directa entre los dos.

---

### B. `shared/` — presentación reutilizable

- **`components/StatusBadge`**: input signal del status, computa clase Tailwind con `computed()`.
- **`components/Toast`**: lee el signal de `NotificationService` directamente en template (`@for (n of notifications.items(); track n.id)`).
- **`pipes/budget.pipe.ts`**: pipe puro `cents → 'USD 50'`.
- **`models/api.models.ts`**: shapes wire (`Campaign`, `Client`, `InspirationJob`, …) en snake_case para coincidir con el backend.

**Regla**: solo entra lo que **dos o más** features usan hoy.

---

### C. `features/<feature>/` — autónomas

Cada feature tiene tres sub-capas:

| Subcarpeta | Qué es | Conoce... |
|---|---|---|
| `data/` | facade (`Injectable` singleton con signals) | el `ApiClient` |
| `ui/` | presentacionales (`OnPush`, `input()` / `output()`) | nada — solo props y eventos |
| `pages/` | smart components routeados | el facade + componentes ui |

A veces hay también `domain/` (ej. `campaigns/domain/publish-request.builder.ts`).

#### Por qué el facade en `data/` con signals

```ts
@Injectable({ providedIn: 'root' })
export class CampaignsService {
  readonly list = signal<Campaign[]>([]);
  readonly current = signal<Campaign | null>(null);

  loadByClient(clientId: string): void {
    this.api.listCampaigns(clientId).subscribe(list => this.list.set(list));
  }

  updateStatus(id: string, status: string): void {
    // Optimistic UI: aplica antes de la respuesta, revierte si falla
    const prev = this.current();
    if (prev) this.current.set({ ...prev, status: status as Campaign['status'] });
    this.api.updateStatus(id, status).subscribe({
      next: c => this.current.set(c),
      error: () => this.current.set(prev),
    });
  }
}
```

Los componentes binden `campaigns.list()` en sus templates — se actualizan
automáticamente cuando el signal cambia, sin `subscribe` manual.

#### Polling reactivo en `inspiration.service.ts`

RxJS para el stream + signal para el estado terminal:

```ts
private poll(jobId: string): void {
  this.pollSub = interval(2000)
    .pipe(
      switchMap(() => this.api.getJob(jobId)),
      takeWhile(j => j.status !== 'ready' && j.status !== 'failed', true), // inclusivo
    )
    .subscribe(j => this.job.set(j));
}
```

Lo que sale del observable se vierte en el signal — el resto de la app lee
signal.

#### Reactive Forms (`campaign-form.ts`)

`NonNullableFormBuilder` con `Validators.minLength(...)` etc. El componente NO
inyecta servicios — emite el valor validado por `output<NewCampaignInput>()`.
El wizard (página) decide qué hacer con él.

---

### D. `app/` — routing y composition root

#### `app.routes.ts`

Rutas con **lazy `loadComponent`** para code-splitting. Cada feature page viaja
en su propio chunk:

```ts
{ path: 'campaigns/new', loadComponent: () => import('./features/.../new-campaign-page').then(m => m.NewCampaignPage) }
```

Visible en `pnpm build`:
```
chunk-SXALQ6SI.js     new-campaign-page    54.59 kB
chunk-GPMFYXY6.js     campaign-detail-page  3.58 kB
```

#### `app.config.ts`

```ts
provideRouter(routes, withComponentInputBinding()),
provideHttpClient(withInterceptors([baseUrlInterceptor, errorInterceptor])),
```

`withComponentInputBinding()` permite que el param `:id` llegue como
`input.required<string>()` en `CampaignDetailPage`. Un `effect` recarga al
cambiar el id.

#### El wizard es el composition root

`features/campaigns/pages/new-campaign-page.ts` importa **tres features**:
`ClientSelector` (clients), `ImageSelector`/`CopySelector`/`AssetCombiner`
(inspiration), `CampaignForm` (campaigns), y el Builder.

```ts
@Component({
  imports: [
    ClientSelector, CampaignForm,
    InspirationLoader, ImageSelector, CopySelector, AssetCombiner,
  ],
  // ...
})
```

Es la única violación admitida de "una feature no importa de otra" — y vive
en `features/campaigns/pages/`, no dentro de un componente reusable. La página
es la composición; los componentes siguen siendo features autónomas.

---

## Idiomas específicos de Angular 20 que se ven aquí

- **Standalone components** (sin NgModules) — el default de Angular 20.
- **Signals**: `signal`, `computed`, `effect`, `input()`, `output()`.
- **Nuevo control flow** en templates: `@if`, `@for (… ; track …)`.
- **`OnPush`** en todos los componentes (encaja natural con signals).
- **Functional HTTP interceptors** (`HttpInterceptorFn`).
- **`withComponentInputBinding()`** — params de ruta como `input()` signals.
- **`computed`** para estado derivado del wizard: `selectedImage`, `selectedCopy`, `canPublish`.
- **`effect`** para reaccionar a cambios de input (recargar al cambiar `:id`).
- **Lazy loading por ruta** con `loadComponent`.
- **`OnDestroy` para liberar polling**: `this.inspiration.reset()` cuando el usuario abandona el wizard a media generación.

---

## Datos: proxy al backend real

`proxy.conf.json` reescribe `/api/*` → backend real:

```json
{ "/api": { "target": "http://localhost:8000", "pathRewrite": { "^/api": "" }, "changeOrigin": true } }
```

`angular.json` referencia ese archivo en `architect.serve.options.proxyConfig`,
así `pnpm start` levanta dev server con el proxy listo. **No hay mock**: el
desarrollo siempre va contra un backend real (Python, Go o Nest, da igual).

---

## Diagrama: el flujo del wizard

```
Browser
  ▼
[app/features/campaigns/pages/new-campaign-page.ts]  (composition root)
  │ signals: client, form, started, imageIndex, copyIndex, publishing
  │ computed: selectedImage, selectedCopy, canPublish
  │
  ├─→ <app-client-selector>     [features/clients/ui]
  │     usa ClientsService (facade)  → ApiClient.listClients()
  │                                       ▼
  │                                  baseUrlInterceptor → '/api/clients'
  │                                       ▼
  │                                  proxy de Angular → http://localhost:8000/clients
  │
  ├─→ <app-campaign-form>       [features/campaigns/ui]
  │     onSubmit emite NewCampaignInput  →  página llama InspirationService.start()
  │                                          ApiClient.startInspiration(...)
  │                                          arranca polling con RxJS
  │                                          signals isReady, images, copies
  │
  ├─→ <app-image-selector>, <app-copy-selector>, <app-asset-combiner>
  │     inputs/outputs presentacionales
  │
  └─→ button "Crear campaña":
        PublishRequestBuilder.forJob().forClient().withCampaign().withSelection().build()
        ▼
        CampaignsService.publish(req).subscribe(c => router.navigate(['/campaigns', c.id]))
```

---

## Pruebas

No hay tests por ahora — el usuario optó por proxy al backend real sin E2E. El
diseño quedó preparado:

- Las facades en `data/` son inyectables y testeables con `Test.createTestingModule({ providers: [{ provide: ApiClient, useValue: fakeApi }] })`.
- Los componentes presentacionales se testean con `ComponentFixture` y
  `setInput()`.
- Para E2E, Playwright pegaría a `pnpm start` con un backend Python/Go corriendo.
