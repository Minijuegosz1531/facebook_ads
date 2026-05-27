"""HTTP router for the AI inspiration pipeline."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, HTTPException

from adapters.inbound.http.schemas.inspiration import JobOut, StartInspirationRequest
from domain.use_cases.generate_inspiration import GenerateInspirationCommand
from infrastructure.container import get_container

router = APIRouter()


@router.post("/search", response_model=JobOut, status_code=202)
async def start_inspiration(req: StartInspirationRequest, background: BackgroundTasks):
    container = get_container()
    service = container.inspiration_service()
    job_id = str(uuid.uuid4())
    cmd = GenerateInspirationCommand(
        job_id=job_id,
        client_id=req.client_id,
        client_name=req.client_name,
        product=req.product,
        description=req.description,
        objective=req.objective,
        country=req.country,
        platforms=req.platforms,
        image_count=req.image_count,
        copy_count=req.copy_count,
        webhook_base_url=container.settings.BASE_URL,
    )
    job = await service.start(cmd)

    if container.settings.USE_STUBS:
        # No queue in stub mode: run the (deterministic, fast) pipeline inline.
        background.add_task(service.run, job_id)
    else:
        from arq import create_pool

        from infrastructure.redis import redis_settings

        pool = await create_pool(redis_settings())
        await pool.enqueue_job("generate_inspiration", cmd.__dict__)
        await pool.aclose()

    return JobOut.from_domain(job)


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str):
    container = get_container()
    service = container.inspiration_service()
    job = await service.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobOut.from_domain(job)
