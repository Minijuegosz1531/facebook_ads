"""arq worker: runs the Meta CLI pipeline to publish a campaign from a selection.

Run with:  arq adapters.inbound.workers.worker_campaign.WorkerSettings
"""
from __future__ import annotations

from domain.use_cases.select_assets_and_publish import SelectAndPublishCommand
from infrastructure.container import get_container
from infrastructure.redis import redis_settings


async def publish_campaign(ctx, payload: dict) -> dict:
    container = get_container()
    service = container.campaign_service(ad_account_id=payload["ad_account_id"])
    campaign = await service.publish_from_job(SelectAndPublishCommand(**payload))
    return {"campaign_id": campaign.id, "meta_campaign_id": campaign.meta_campaign_id}


async def startup(ctx) -> None:
    ctx["container"] = get_container()


class WorkerSettings:
    functions = [publish_campaign]
    on_startup = startup
    redis_settings = redis_settings()
    max_jobs = 4  # Meta CLI is rate-limited; keep parallelism low
    job_timeout = 120
    keep_result = 86_400
