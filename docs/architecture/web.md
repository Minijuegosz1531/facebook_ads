# `apps/web` — Next.js 16 · React 19

Frontend principal: Next.js 16 con App Router, React 19, TanStack Query, Zod 4,
Tailwind 4. Arquitectura **feature-based con capas**. Consume las APIs (Python,
Go o Nest) a través de sus propias **route handlers** (que actúan como proxy o
mock según `MOCK_API`).

Para los patrones concretos del código, ver [`../patterns.md`](../patterns.md).
Para la teoría compartida, [`README.md`](README.md).

---

## Stack

| Pieza | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 (Server Components, Actions) |
| Datos | TanStack Query 5 (lecturas + polling) + Server Actions (mutaciones) |
| Validación | Zod 4 |
| Styling | Tailwind 4 (engine Oxide) |
| ORM (read-side) | Prisma 7 (modelo documentado, no usado en runtime) |
| E2E | Playwright |

---

## Layout

```
apps/web/
├── app/                                  # App Router: SOLO routing + composición de ruta
│   ├── (dashboard)/
│   │   ├── layout.tsx                    # shell con sidebar
│   │   ├── campaigns/
│   │   │   ├── page.tsx                  # lista
│   │   │   ├── new/page.tsx              # WIZARD (composition root)
│   │   │   └── [id]/page.tsx             # detalle
│   │   └── clients/page.tsx
│   └── api/                              # Route Handlers: proxy hacia el backend, o mock
│       ├── campaigns/                    # GET/POST + [id]/route.ts + [id]/status, [id]/insights
│       ├── inspiration/                  # POST + [jobId]/route.ts (polling)
│       └── clients/route.ts
├── features/                             # cada feature es autónoma
│   ├── campaigns/
│   │   ├── actions/                      # Server Actions (createCampaign, updateStatus, …)
│   │   ├── components/                   # CampaignList, CampaignForm, CampaignDetail, AdCard
│   │   ├── hooks/                        # useCampaigns, useCampaignDetail, useCampaignStatus
│   │   ├── schemas/                      # Zod
│   │   └── types.ts
│   ├── inspiration/
│   │   ├── components/                   # ImageSelector, CopySelector, AssetCombiner, Loader
│   │   ├── hooks/                        # useInspirationJob (polling), useAssetSelection
│   │   └── types.ts
│   └── clients/
│       ├── components/, hooks/, types.ts
├── shared/
│   ├── components/                       # StatusBadge, MetricCard
│   ├── lib/
│   │   ├── api-client.ts                 # fetcher hacia /api/*
│   │   ├── backend/                      # módulo que ENCAPSULA mock vs http
│   │   │   ├── index.ts                  # elige mock o http según MOCK_API
│   │   │   ├── mock.ts                   # in-memory store
│   │   │   ├── http.ts                   # proxy al microservicio
│   │   │   └── types.ts                  # Backend interface
│   │   └── utils.ts
│   └── types/api.ts
└── prisma/schema.prisma                  # modelo de referencia
```

---

## Capa por capa

### A. `app/` — routing y composición de ruta

**Qué contiene:**
- **Rutas** definidas por estructura de carpetas (App Router de Next.js).
- **Layouts** (sidebar, shell).
- **Pages**: Server Components delgados que renderizan un componente de una feature.
- **Route Handlers** (`app/api/**/route.ts`): el backend del frontend — proxy a la API real o servidor mock para E2E.

**Qué NO contiene:**
- Lógica de negocio.
- Fetching directo a APIs externas (lo hace el módulo `shared/lib/backend/`).
- Estado de aplicación.

**Funciones / decisiones idiomáticas Next.js:**

#### Por qué Server Components por default

Las pages se renderizan en el servidor. El cliente solo recibe HTML + un bundle
pequeño con los componentes marcados `"use client"`. Los hooks de TanStack
Query y los componentes interactivos (CampaignForm, ImageSelector) son
explícitamente client; el resto (CampaignDetail page) es server.

#### Por qué Route Handlers en lugar de llamar al microservicio desde el browser

1. **Mock para E2E**: en `MOCK_API=1` las route handlers sirven datos en memoria, así Playwright corre standalone sin Python/Go.
2. **Sin CORS**: el browser habla con el mismo origen (`/api/...`), no con `localhost:8000`.
3. **Punto único** para añadir caching/edge/rewrites en producción.

#### Por qué el wizard es una page con `"use client"`

`app/(dashboard)/campaigns/new/page.tsx` es **el composition root** donde se
cruzan las features `clients`, `inspiration` y `campaigns`. Es client (manejo
de estado interactivo con `useState`) y es la única excepción a "pages son
Server Components delgados" — la única razón legítima para que dos+ features
se encuentren.

---

### B. `features/<feature>/` — features autónomas

**Qué contiene cada feature:**
- `actions/`: **Server Actions** (`"use server"`) que validan con Zod y llaman al backend (server-side).
- `components/`: client components (`"use client"`) — el formulario, lista, detalle, preview.
- `hooks/`: TanStack Query hooks (`useCampaigns`, `useInspirationJob`).
- `schemas/`: schemas Zod de la feature.
- `types.ts`: re-exporta tipos de `shared/types/api.ts` + tipos propios.

**Qué NO contiene:**
- Imports de otra feature. Si la feature `campaigns` necesita `ClientSelector` (`features/clients/`) o `ImageSelector` (`features/inspiration/`), la composición sucede en la página de la ruta, no aquí.
- HTTP directo (los componentes usan los hooks; los hooks usan `apiClient`).

**Funciones / decisiones idiomáticas:**

#### Server Actions para mutaciones, TanStack Query para lecturas

```ts
// features/campaigns/actions/publishCampaign.ts
"use server";
export async function publishCampaign(input) {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: ... };
  const campaign = await backend.publishFromJob(parsed.data);
  revalidatePath("/campaigns");
  return { ok: true, campaign };
}
```

Las mutaciones se ejecutan en el servidor, validadas con Zod, y disparan
`revalidatePath` para invalidar caches RSC. Las lecturas y el polling viven en
hooks client-side con `useQuery`/`refetchInterval`.

#### Polling de inspiración con `refetchInterval` reactivo

```ts
// features/inspiration/hooks/useInspirationJob.ts
useQuery({
  queryKey: ["inspiration", jobId],
  refetchInterval: (q) =>
    q.state.data?.status === "ready" || q.state.data?.status === "failed"
      ? false
      : 2000,
});
```

El `refetchInterval` lee el último valor; cuando el job entra en estado
terminal, devuelve `false` y el polling se detiene solo.

---

### C. `shared/` — genuinamente compartido

**Qué contiene:**
- `components/`: `StatusBadge`, `MetricCard` — usados por 2+ features.
- `lib/api-client.ts`: fetcher tipado que llama a `/api/*` desde el cliente.
- `lib/backend/`: el módulo crítico que **encapsula mock vs http**.
- `lib/utils.ts`: helpers puros (`formatBudget`, `cn`).
- `types/api.ts`: shapes wire del backend (snake_case).

#### Por qué el módulo `shared/lib/backend/` es especial

Es el **único sitio** del frontend que sabe si está hablando con un backend real
o con un mock. La interfaz `Backend` define los métodos (`listClients`,
`publishFromJob`, …); el `index.ts` selecciona la implementación:

```ts
import "server-only"; // import error si llega al bundle del browser
export const backend: Backend = process.env.MOCK_API === "1" ? mockBackend : httpBackend;
```

Las **Route Handlers** y las **Server Actions** consumen `backend.*`. Cambiar
entre mock y proxy es una variable de entorno — el resto del código ni se
entera.

---

## Idiomas específicos de Next.js que se ven aquí

- **Server Components por default, `"use client"` solo cuando hay interactividad.**
- **Server Actions** validadas con Zod + `revalidatePath` para invalidar caches.
- **Route Handlers** para exponer `/api/*` desde el mismo proceso.
- **Composition root colocado en la ruta** cuando el flujo cruza features.
- **`server-only`** en módulos que NO deben terminar en el bundle del browser (la implementación mock incluye un store en memoria que no debería viajar al cliente).
- **TanStack Query con `refetchInterval` derivado** para polling sin código a mano.

---

## Diagrama: el flujo del wizard

`/campaigns/new`:

```
Browser
  ▼
[app/(dashboard)/campaigns/new/page.tsx]  (client, composition root)
  │ useState selectedClient, formValue, started, imageIndex, copyIndex
  │
  ├─→ <ClientSelector>     [features/clients/components]
  │     useClients() ─→ apiClient.get('/clients')
  │                          ▼
  │                   [app/api/clients/route.ts]
  │                          ▼
  │                   backend.listClients()  ← shared/lib/backend
  │                          ▼
  │                   mockBackend (MOCK_API=1) o httpBackend → microservicio
  │
  ├─→ <CampaignForm>       [features/campaigns/components]
  │     onSubmit → startInspiration() server action
  │                          ▼
  │                   backend.startInspiration(payload)
  │                          ▼
  │                   job { status: 'ready', images, copies }
  │
  ├─→ <ImageSelector>, <CopySelector>, <AssetCombiner>
  │     useInspirationJob(jobId) polling cada 2s hasta status=ready
  │
  └─→ publishCampaign() server action
        ▼
        backend.publishFromJob(req)
        ▼
        router.push(`/campaigns/${campaign.id}`)
```

---

## Pruebas — qué se prueba en cada capa

| Capa | Tipo | Archivos |
|---|---|---|
| Flujo completo (UI) | Playwright E2E contra `next dev` con `MOCK_API=1` | `apps/web/e2e/campaign-create.spec.ts` |
| Helpers / mappers | (a futuro) Vitest unitarios | — |

El test E2E levanta el dev server con el mock backend in-memory: cero
dependencias externas, mismo binario que dev. El subagente `playwright-e2e`
(`.claude/agents/playwright-e2e.md`) mantiene las convenciones (selectores
estables vía `data-testid`, web-first assertions, no sleeps).
