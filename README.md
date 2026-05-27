# Meta Ads Platform

Plataforma interna para que analistas creen y gestionen campañas de
Facebook/Instagram con asistencia de IA. Monorepo con dos aplicaciones:

| App | Stack | Arquitectura |
|---|---|---|
| `apps/api` | FastAPI · Python 3.13 · SQLAlchemy 2 async · arq · Redis | **Hexagonal** (Ports & Adapters) |
| `apps/api-go` | Go 1.24 · solo stdlib (`net/http`) | **Hexagonal** — reimplementación de estudio |
| `apps/web` | Next.js 16 · React 19 · TanStack Query · Zod 4 · Tailwind 4 | **Feature-based** con capas |

El flujo: el analista llena un formulario → la IA extrae keywords, busca en la
Ad Library, genera 5 imágenes (Higgsfield) y 10 copies (Claude) → el analista
elige imagen+copy → se crea la campaña completa en Meta (en estado `PAUSED`).

## Modo stub

Las integraciones externas (Meta Ads CLI, Higgsfield, Claude, GCS, Postgres,
Redis) tienen implementaciones **stub** deterministas. Con `USE_STUBS=true`
(API) y `MOCK_API=1` (web) todo corre end-to-end **sin credenciales ni
servicios externos** — así funcionan los tests y el dev local.

## Backend — `apps/api`

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt

# Correr en modo stub (sin Postgres/Redis):
USE_STUBS=true uvicorn main:app --reload

# Tests (siempre en modo stub):
pytest
```

Producción: `USE_STUBS=false` + `docker compose up` levanta Postgres, Redis, el
API y un worker `arq`.

### Arquitectura hexagonal

```
adapters/inbound (http, workers) → application → domain/use_cases → domain/ports
                                                                          ▲
                                            adapters/outbound implementan los ports
```

- `domain/` no tiene dependencias externas (regla absoluta).
- Los use cases dependen de ports (interfaces), nunca de adapters.
- `infrastructure/container.py` es el único lugar que construye adapters
  concretos y elige stub vs. real según `USE_STUBS`.

## Backend (Go) — `apps/api-go`

Reimplementación del microservicio en Go con la misma arquitectura hexagonal,
pensada como material de estudio del lenguaje. Solo usa la librería estándar.

```bash
cd apps/api-go
go run ./cmd/api          # :8080 en modo stub
go test -race ./...       # tests + detector de data races
```

Documenta patrones de diseño (Builder, Functional Options, Factory/Composition
Root, Decorator/Middleware) y el mapeo Python⇄Go. Detalles en
[`apps/api-go/README.md`](apps/api-go/README.md).

## Frontend — `apps/web`

El frontend usa **pnpm** (campo `packageManager` en `package.json`; con Corepack:
`corepack enable`).

```bash
cd apps/web
pnpm install

# Dev con backend mock en memoria (sin Python):
MOCK_API=1 pnpm dev             # http://localhost:3000

# Apuntando al FastAPI real:
API_BASE_URL=http://localhost:8000 pnpm dev
```

### Tests E2E (Playwright)

```bash
cd apps/web
pnpm test:e2e:install   # instala Chromium (una vez)
pnpm test:e2e           # levanta `next dev` con MOCK_API=1 y corre los specs
```

### Arquitectura feature-based

```
app/        → routing y composición de ruta (composition root)
features/   → campaigns/, inspiration/, clients/ (autónomas)
shared/     → ui, lib, types genuinamente compartidos
```

Una feature **nunca** importa de otra feature; cuando un flujo cruza features
(p.ej. el wizard de nueva campaña), la composición ocurre en la página de la
ruta en `app/`.

## Subagentes (`.claude/agents/`)

- **architecture-guardian** — revisa diffs/archivos y reporta violaciones de las
  dos arquitecturas (dirección de dependencias, imports entre features, naming).
- **playwright-e2e** — escribe, corre y mantiene los tests E2E de Playwright
  siguiendo las convenciones del proyecto (selectores estables, mock standalone).
```
