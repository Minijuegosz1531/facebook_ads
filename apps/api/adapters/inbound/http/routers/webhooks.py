"""HTTP router for external webhooks (Higgsfield image-ready callbacks)."""
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from domain.models.inspiration import GeneratedImage, JobStatus
from infrastructure.container import get_container

router = APIRouter()


class HiggsfieldCallback(BaseModel):
    request_id: str
    image_url: str
    status: str = "completed"


@router.post("/higgsfield/{job_id}", status_code=200)
async def higgsfield_callback(job_id: str, payload: HiggsfieldCallback):
    """Higgsfield calls this when an image finishes. We persist the permanent
    asset and attach it to the job. URLs from Higgsfield expire in 7 days, so we
    push the image to permanent storage first."""
    container = get_container()
    job = await container.job_store.get(job_id)
    if job is None:
        return {"ok": False, "reason": "unknown job"}

    storage = _build_storage(container)
    dest_key = f"inspiration/{job_id}/{payload.request_id}.jpg"
    permanent_url = await storage.store_from_url(payload.image_url, dest_key)

    job.assets.images.append(
        GeneratedImage(url=permanent_url, request_id=payload.request_id)
    )
    if len(job.assets.images) >= len(job.higgsfield_request_ids) and job.assets.copies:
        job.status = JobStatus.READY
    await container.job_store.save(job)
    return {"ok": True}


def _build_storage(container):
    if container.settings.USE_STUBS:
        from adapters.outbound.stubs import StubStorage

        return StubStorage()
    from adapters.outbound.gcs_adapter import GCSAdapter

    return GCSAdapter(container.settings.GCS_BUCKET_NAME)
