# `apps/api` — FastAPI · Python 3.13

API HTTP + workers en Python sobre FastAPI. Es la implementación de referencia,
runnable en **modo stub** (sin Postgres, Redis ni credenciales) y en modo real
contra los servicios externos (Meta CLI, Higgsfield, Claude, GCS).

Para los patrones concretos del código y dónde están, ver
[`../patterns.md`](../patterns.md). Para la teoría compartida entre las apps,
[`README.md`](README.md).

---

## Stack

| Pieza | Tecnología |
|---|---|
| Runtime | Python 3.13 (async/await nativo) |
| HTTP | FastAPI 0.128, Pydantic v2, Uvicorn |
| Persistencia | SQLAlchemy 2 async + asyncpg, Alembic |
| Cola | `arq` 0.26 + Redis 8 |
| IA | Anthropic SDK 0.104, Higgsfield client, Meta Ad Library REST |
| Storage | google-cloud-storage |
| Tests | pytest + pytest-asyncio + httpx ASGI |

---

## Layout

```
apps/api/
├── domain/                       # NÚCLEO sin dependencias externas
│   ├── models/                   # dataclasses puras (Campaign, Client, …)
│   ├── ports/
│   │   ├── inbound/              # interfaces de los services (ICampaignService, …)
│   │   └── outbound/             # IAdPlatform, ICampaignRepository, IJobStore, …
│   └── use_cases/                # lógica pura (CreateCampaignUseCase, …)
├── application/                  # servicios que orquestan use cases
├── adapters/
│   ├── inbound/
│   │   ├── http/
│   │   │   ├── routers/          # endpoints FastAPI
│   │   │   └── schemas/          # Pydantic request/response
│   │   └── workers/              # arq workers (Redis consumer)
│   └── outbound/                 # implementaciones de los ports
│       ├── stubs.py              # in-memory para dev/tests
│       ├── meta_cli_adapter.py
│       ├── higgsfield_adapter.py
│       ├── claude_adapter.py
│       ├── ad_library_adapter.py
│       ├── gcs_adapter.py
│       ├── postgres_repository.py
│       └── redis_job_store.py
├── infrastructure/
│   ├── container.py              # composition root (stub vs real)
│   ├── database.py               # SQLAlchemy engine
│   └── redis.py                  # arq pool
├── config.py                     # pydantic-settings desde .env
├── main.py                       # FastAPI app + lifespan + routers
└── tests/                        # pytest (asyncio_mode=auto)
```

---

## Capa por capa

### 1. Dominio — `domain/`

**Qué contiene:**
- `models/`: dataclasses Python puras con `from __future__ import annotations` (tipos como strings) para evitar ciclos. Una entidad = un archivo.
- `ports/outbound/`: clases abstractas con `ABC` + `@abstractmethod` para cada interfaz que necesita el dominio (`IAdPlatform`, `ICampaignRepository`, `IJobStore`, …).
- `ports/inbound/`: contratos de los services (`ICampaignService`, `IInspirationService`). Sirven para tests y para documentar la superficie pública.
- `use_cases/`: una clase por intención (`CreateCampaignUseCase`, `GenerateInspirationUseCase`, …). Reciben ports en `__init__` y exponen un `async def execute(cmd)`.

**Qué NO contiene:**
- Imports de `fastapi`, `sqlalchemy`, `redis`, `arq`, `httpx`, `anthropic`. Solo stdlib + tipos del propio dominio.

**Funciones / decisiones idiomáticas Python:**
- **`ABC` + `@abstractmethod`** para forzar la implementación de los ports en runtime (Python no tiene "interfaces" como Go o TS).
- **`@dataclass`** para entidades — concisas, comparables por valor, serializables.
- **`async def`** en todos los métodos de ports: el dominio asume IO async para no pintar la fachada de sync con `asyncio.run` en los adapters.
- **Sentinel exceptions del dominio**: el dominio levanta `LookupError`/`ValueError`/`IndexError` para casos universales; el adapter inbound los traduce a `HTTPException(404|400|...)`.

**Por qué esta capa existe:** los tests unitarios (`apps/api/tests/test_create_campaign.py`, `test_inspiration_pipeline.py`) corren en milisegundos con stubs in-memory; no se monta Postgres, ni Redis, ni se llama a Meta. Cambiar de Higgsfield a otro generador es un nuevo adapter sin tocar la lógica del pipeline.

---

### 2. Aplicación — `application/`

**Qué contiene:** dos services concretos (`CampaignService`, `InspirationService`) que implementan los `ports/inbound`. Cada uno crea sus use cases en `__init__` y delega.

**Por qué los services y no usar los use cases directos:** un router con 6 endpoints inyectaría 6 use cases. El service ofrece un único `Depends(…)` para FastAPI. También centraliza el "publicar campaña desde job" (`publish_from_job`) que compone `SelectAssetsAndPublishUseCase` con `CreateCampaignUseCase`, sin que el router conozca esa composición.

---

### 3. Adapters inbound — `adapters/inbound/`

#### HTTP — `adapters/inbound/http/`

**Routers** (`routers/campaigns.py`, `inspiration.py`, `clients.py`, `webhooks.py`):
- Solo decoran funciones con `@router.get/post/patch`.
- Validan request con `schemas/` (Pydantic).
- Obtienen el service vía `get_container().campaign_service(ad_account_id)`.
- Mapean errores de dominio a `HTTPException`.

**Schemas** (`schemas/campaign.py`, `inspiration.py`): Pydantic v2 con `Field(min_length=...)` etc. Tienen `from_domain(c: Campaign)` para mapear a wire (snake_case automático).

**Por qué FastAPI y no Flask/Starlette pelado:** Pydantic v2 ya está en juego (validación), OpenAPI gratis, async nativo, y `Depends` cubre la inyección por request del `MetaCLIAdapter` (que necesita el `ad_account_id` del cliente).

#### Workers — `adapters/inbound/workers/`

**`worker_inspiration.py`** y **`worker_campaign.py`** definen `WorkerSettings` con `functions = [...]`. Se arrancan con `arq adapters.inbound.workers.worker_inspiration.WorkerSettings`. Cada función:
- Decodifica el payload (dict serializado en Redis).
- Resuelve el service vía el container.
- Llama al método correspondiente.

**Por qué `arq` y no Celery:** async nativo (el pipeline es I/O bound), type hints + Pydantic en las funciones, `WorkerSettings` declarativo, sin Celery beat para los schedules. RQ se descartó por ser sync.

---

### 4. Adapters outbound — `adapters/outbound/`

Cada port tiene **dos** implementaciones:

| Port | Stub (in-memory) | Real |
|---|---|---|
| `ICampaignRepository` | `stubs.py::InMemoryCampaignRepository` | `postgres_repository.py` |
| `IClientRepository` | `stubs.py::InMemoryClientRepository` | (semillas in-memory por ahora) |
| `IJobStore` | `stubs.py::InMemoryJobStore` | `redis_job_store.py` |
| `IAdPlatform` | `stubs.py::StubAdPlatform` | `meta_cli_adapter.py` |
| `IAdLibrary` | `stubs.py::StubAdLibrary` | `ad_library_adapter.py` |
| `IImageGenerator` | `stubs.py::StubImageGenerator` | `higgsfield_adapter.py` |
| `ICopyGenerator` | `stubs.py::StubCopyGenerator` | `claude_adapter.py` |
| `IStorage` | `stubs.py::StubStorage` | `gcs_adapter.py` |

**Decisión clave**: los stubs viven al lado de los reales, no en `tests/`. Son **producción del modo dev**. El mismo binario sirve dev y E2E.

**Imports diferidos en los reales**: cada adapter real importa su dependencia (`anthropic`, `httpx`, `redis`, `sqlalchemy`) **dentro del método**, no a nivel de módulo. Así, en modo stub no hace falta tener instaladas las libs de IA/BD para correr. Ejemplo:

```python
# adapters/outbound/claude_adapter.py
def _client(self):
    from anthropic import AsyncAnthropic  # lazy: solo si USE_STUBS=false
    return AsyncAnthropic(api_key=self._api_key)
```

---

### 5. Infraestructura / composition root — `infrastructure/`

**`container.py`** es el **único sitio** que decide qué clase concreta cumple cada port.

```python
class Container:
    def __init__(self, settings):
        self.campaign_repo = self._build_campaign_repo()  # stub o postgres
        self.job_store     = self._build_job_store()       # stub o redis
        # ...

    def _build_campaign_repo(self) -> ICampaignRepository:
        if self.settings.USE_STUBS:
            from adapters.outbound.stubs import InMemoryCampaignRepository
            return InMemoryCampaignRepository()
        from adapters.outbound.postgres_repository import PostgresCampaignRepository
        return PostgresCampaignRepository(self.settings.DATABASE_URL)
```

`get_container()` está cacheado con `@lru_cache` → el container es singleton por proceso.

**`config.py`** lee env vars con `pydantic-settings`. Default `USE_STUBS=true`.

**`database.py`** / **`redis.py`** dan helpers async para los reales; en stub mode son no-op.

**`main.py`** monta la FastAPI app, registra routers, y un `lifespan` async que inicializa el schema (no-op en stub).

---

## Idiomas específicos de Python que se ven aquí

- **`async def` en toda la cadena**, sin mezclar sync (evita el problema "color de funciones"). El `MetaCLIAdapter` envuelve `subprocess.run` con `asyncio.to_thread` para no bloquear el event loop.
- **`ABC` + `@abstractmethod`** como contratos en runtime, no solo tipos. Si una subclase olvida un método, Python falla al instanciar.
- **`@dataclass` + `from __future__ import annotations`** para entidades — barato y suficiente.
- **`StrEnum`** (Python 3.11+) para `CampaignStatus`, `BudgetType`, `JobStatus` — comparables a strings y serializables sin glue.
- **`@lru_cache`** para singletons (container, settings) — equivalente a "providedIn root" sin DI container.

---

## Diagrama: una request real recorre las capas

`POST /campaigns/publish-from-job`:

```
HTTP
  ▼
[Inbound HTTP] routers/campaigns.py: publish_from_job(req)
       │ Pydantic valida → construye SelectAndPublishCommand
       ▼
[Application] CampaignService.publish_from_job(cmd)
       ▼
[Dominio] SelectAssetsAndPublishUseCase.execute(cmd)
       ├─ job_store.get(...)            ─┐
       ├─ valida estado (ready?)         │  habla por
       └─ CreateCampaignUseCase.execute  │  INTERFACES (ports)
             ├─ ad_platform.create_*     │
             └─ campaign_repo.save(...)  ─┘
       ▼
[Outbound] el container decide:
   USE_STUBS=true  → InMemoryCampaignRepository + StubAdPlatform
   USE_STUBS=false → PostgresCampaignRepository + MetaCLIAdapter
       ▲
[Inbound HTTP] CampaignOut.from_domain(c) → 201 JSON snake_case
```

---

## Pruebas — qué se prueba en cada capa

| Capa | Tipo de test | Archivos |
|---|---|---|
| Use cases | unit con stubs in-memory directos | `tests/test_create_campaign.py`, `test_inspiration_pipeline.py` |
| HTTP completo (stub mode) | smoke E2E con `httpx.ASGITransport` | `tests/test_api_smoke.py` |
| Adapters reales | (a futuro) integration tests aislados con `pytest -m integration` | — |

El `conftest.py` fija `USE_STUBS=true` antes de importar el app — así todos los
tests viven en el modo determinista sin necesidad de mocks.
