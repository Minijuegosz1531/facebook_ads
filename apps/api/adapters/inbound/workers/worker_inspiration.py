"""arq worker: runs the inspiration pipeline (Ad Library + Claude + Higgsfield).

Run with:  arq adapters.inbound.workers.worker_inspiration.WorkerSettings
"""
from __future__ import annotations

from domain.use_cases.generate_inspiration import GenerateInspirationCommand
from infrastructure.container import get_container
from infrastructure.redis import redis_settings


async def generate_inspiration(ctx, payload: dict) -> dict:
    service = get_container().inspiration_service()
    job = await service.run_command(GenerateInspirationCommand(**payload))
    return {"job_id": job.id, "status": str(job.status), "images": len(job.assets.images)}


async def startup(ctx) -> None:
    ctx["container"] = get_container()


class WorkerSettings:
    functions = [generate_inspiration]
    on_startup = startup
    redis_settings = redis_settings()
    max_jobs = 10
    job_timeout = 600  # 10 min — Higgsfield can be slow
    keep_result = 86_400  # results live 24h in Redis
