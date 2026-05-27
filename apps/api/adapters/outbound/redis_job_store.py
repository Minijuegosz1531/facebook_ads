"""IJobStore implementation backed by Redis (short-lived inspiration job state).

Imported only in non-stub mode, so redis is a hard import here.
"""
from __future__ import annotations

import json
from dataclasses import asdict

from redis.asyncio import Redis

from domain.models.inspiration import (
    Copy,
    GeneratedAssets,
    GeneratedImage,
    InspirationJob,
    JobStatus,
    ReferenceAd,
)
from domain.ports.outbound.job_store import IJobStore

TTL_SECONDS = 86_400  # 24h, matches arq keep_result


class RedisJobStore(IJobStore):
    def __init__(self, redis_url: str):
        self._redis = Redis.from_url(redis_url, decode_responses=True)

    @staticmethod
    def _key(job_id: str) -> str:
        return f"inspiration:job:{job_id}"

    async def save(self, job: InspirationJob) -> None:
        payload = asdict(job)
        payload["status"] = str(job.status)
        payload["created_at"] = job.created_at.isoformat()
        await self._redis.set(self._key(job.id), json.dumps(payload), ex=TTL_SECONDS)

    async def get(self, job_id: str) -> InspirationJob | None:
        raw = await self._redis.get(self._key(job_id))
        if raw is None:
            return None
        data = json.loads(raw)
        assets = data.get("assets", {})
        return InspirationJob(
            id=data["id"],
            client_id=data["client_id"],
            keywords=data.get("keywords", []),
            country=data.get("country", ""),
            platforms=data.get("platforms", []),
            status=JobStatus(data["status"]),
            reference_ads=[ReferenceAd(**r) for r in data.get("reference_ads", [])],
            assets=GeneratedAssets(
                images=[GeneratedImage(**i) for i in assets.get("images", [])],
                copies=[Copy(**c) for c in assets.get("copies", [])],
            ),
            higgsfield_request_ids=data.get("higgsfield_request_ids", []),
            error=data.get("error"),
        )
