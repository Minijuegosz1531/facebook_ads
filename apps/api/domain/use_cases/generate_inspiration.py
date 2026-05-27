"""Use case: the AI inspiration pipeline.

keywords → Ad Library → (Higgsfield images ∥ Claude copies) → persist job state.

This use case is pure: it orchestrates ports only and knows nothing about
Redis, HTTP, Higgsfield or Anthropic concretely.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field

from domain.models.inspiration import GeneratedImage, InspirationJob, JobStatus
from domain.ports.outbound.ad_library import IAdLibrary
from domain.ports.outbound.copy_generator import ICopyGenerator
from domain.ports.outbound.image_generator import IImageGenerator
from domain.ports.outbound.job_store import IJobStore


@dataclass
class GenerateInspirationCommand:
    job_id: str
    client_id: str
    client_name: str
    product: str
    description: str
    objective: str
    country: str
    webhook_base_url: str
    platforms: list[str] = field(default_factory=lambda: ["facebook", "instagram"])
    image_count: int = 5
    copy_count: int = 10


class GenerateInspirationUseCase:
    def __init__(
        self,
        ad_library: IAdLibrary,
        image_generator: IImageGenerator,
        copy_generator: ICopyGenerator,
        job_store: IJobStore,
    ):
        self.ad_library = ad_library
        self.image_generator = image_generator
        self.copy_generator = copy_generator
        self.job_store = job_store

    async def execute(self, cmd: GenerateInspirationCommand) -> InspirationJob:
        job = await self.job_store.get(cmd.job_id) or InspirationJob(
            id=cmd.job_id, client_id=cmd.client_id, country=cmd.country
        )

        try:
            # 1. keywords + Ad Library research
            job.status = JobStatus.SEARCHING
            job.platforms = cmd.platforms
            await self.job_store.save(job)

            keywords = await self.copy_generator.extract_keywords(cmd.description)
            job.keywords = keywords
            reference_ads = await self.ad_library.search_top_ads(
                keywords, cmd.country, cmd.platforms
            )
            job.reference_ads = reference_ads

            # 2. images + copies in parallel
            job.status = JobStatus.GENERATING
            await self.job_store.save(job)

            webhook_url = f"{cmd.webhook_base_url}/webhooks/higgsfield/{job.id}"
            request_ids, copies = await asyncio.gather(
                self.image_generator.generate(
                    reference_ads, cmd.product, cmd.country, webhook_url, cmd.image_count
                ),
                self.copy_generator.generate_copies(
                    reference_ads,
                    cmd.client_name,
                    cmd.product,
                    cmd.objective,
                    cmd.country,
                    cmd.copy_count,
                ),
            )
            job.higgsfield_request_ids = request_ids
            job.assets.copies = copies
            # Stub image generators return ready URLs directly; the Higgsfield
            # webhook fills these in for real generation.
            job.assets.images = [
                GeneratedImage(url=rid, request_id=rid)
                for rid in request_ids
                if rid.startswith("http")
            ]

            job.status = JobStatus.READY
            await self.job_store.save(job)
        except Exception as exc:  # noqa: BLE001 — record failure on the job
            job.status = JobStatus.FAILED
            job.error = str(exc)
            await self.job_store.save(job)
            raise

        return job
