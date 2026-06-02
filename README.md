# Meta Ads Platform

Plataforma interna para que analistas creen y gestionen campañas de
Facebook/Instagram con asistencia de IA. Monorepo con dos aplicaciones:

| App | Stack | Arquitectura |
|---|---|---|
| `apps/api` | FastAPI · Python 3.13 · SQLAlchemy 2 async · arq · Redis | **Hexagonal** (Ports & Adapters) |
| `apps/api-go` | Go 1.24 · solo stdlib (`net/http`) | **Hexagonal** — reimplementación de estudio |
| `apps/api-nest` | NestJS 11 · TypeScript · class-validator | **Hexagonal** — reimplementación de estudio |
| `apps/web` | Next.js 16 · React 19 · TanStack Query · Zod 4 · Tailwind 4 | **Feature-based** con capas |
| `apps/web-angular` | Angular 20 · signals · standalone · Reactive Forms · Tailwind 4 | **Feature-based** — frontend de estudio |

> 📚 Documentación de arquitectura **por app** (capas, funciones, decisiones):
> [`docs/architecture/`](docs/architecture/). Catálogo de **patrones de diseño**
> con rutas de archivo: [`docs/patterns.md`](docs/patterns.md).

El flujo: el analista llena un formulario → la IA extrae keywords, busca en la
Ad Library, genera 5 imágenes (Higgsfield) y 10 copies (Claude) → el analista
elige imagen+copy → se crea la campaña completa en Meta (en estado `PAUSED`).

## Modo stub

Las integraciones externas (Meta Ads CLI, Higgsfield, Claude, GCS, Postgres,
Redis) tienen implementaciones **stub** deterministas. Con `USE_STUBS=true`
(API) y `MOCK_API=1` (web) todo corre end-to-end **sin credenciales ni
servicios externos** — así funcionan los tests y el dev local.

## Saltar entre APIs (y webs) con Docker

Las tres APIs se exponen en **el mismo puerto** (8000) y comparten el alias de
red `api`, así que las webs siempre apuntan a la API activa sin cambiar nada.

```bash
# APIs (una a la vez — todas compiten por el puerto 8000):
make python        # FastAPI                · localhost:8000
make go            # Go API                  · localhost:8000
make nest          # NestJS                  · localhost:8000

make python-full   # FastAPI + Postgres + Redis + arq worker
make go-full       # Go API + Redis + asynq worker

# Webs (independientes, conviven con cualquier API):
make web           # Next.js (prod build)    · localhost:3000
make web-angular   # Angular (nginx)         · localhost:4200

make down          # detiene todo
make logs          # logs en vivo
make status        # qué hay corriendo
```

**Combinaciones reales** — la API y la web son ortogonales:

```bash
make python && make web              # FastAPI + Next.js
make go     && make web-angular      # Go API + Angular
make nest   && make web              # NestJS + Next.js
make python && make web && make web-angular   # los tres a la vez
```

Cada `make <api>` solo detiene **otras APIs** (mantiene las webs vivas), y cada
`make <web>` solo detiene **otras webs** (mantiene la API). Internamente:
- Los tres `api-*` services declaran `aliases: [api]` en la red de compose.
- La web Angular sirve con nginx y proxea `/api/*` → `http://api:8000` (ver
  [`apps/web-angular/nginx.conf`](apps/web-angular/nginx.conf)).
- La web Next.js usa `API_BASE_URL=http://api:8000` para que las route handlers
  proxeen al backend en lugar de ir al mock.

Equivalente sin Make:

```bash
docker compose --profile python up --build -d
docker compose --profile web    up --build -d
docker compose down
```

Detalles en [`docker-compose.yml`](docker-compose.yml) y [`Makefile`](Makefile).

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

## Backend (NestJS) — `apps/api-nest`

Reimplementación en NestJS 11 + TypeScript con la misma arquitectura hexagonal,
aprovechando los idiomas de Nest: módulos, decoradores, DI por símbolo, pipes,
filtros e interceptores. Runnable en modo stub.

```bash
cd apps/api-nest
pnpm install
pnpm start:dev               # :8080
pnpm test && pnpm test:e2e
```

Detalles y mapeo Python⇄Go⇄NestJS en [`apps/api-nest/README.md`](apps/api-nest/README.md).

## Frontend (Angular) — `apps/web-angular`

Reimplementación del frontend en Angular 20 (signals, standalone, lazy loading)
como material de estudio, con patrones de diseño documentados (Adapter, Facade,
Builder, Observer, interceptores funcionales). Consume el mismo backend vía el
proxy de Angular (`proxy.conf.json`), sin mock.

```bash
cd apps/web-angular
pnpm install
pnpm start          # http://localhost:4200 (proxy /api → http://localhost:8000)
```

Detalles y mapeo Next.js⇄Angular en [`apps/web-angular/README.md`](apps/web-angular/README.md).

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
