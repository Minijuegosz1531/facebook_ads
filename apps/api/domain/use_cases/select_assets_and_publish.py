"""Use case: the analyst picks one image + one copy from a finished inspiration
job and we publish a full campaign from that selection."""
from __future__ import annotations

from dataclasses import dataclass

from domain.models.campaign import Campaign
from domain.models.inspiration import JobStatus
from domain.ports.outbound.job_store import IJobStore
from domain.use_cases.create_campaign import CreateCampaignCommand, CreateCampaignUseCase


@dataclass
class SelectAndPublishCommand:
    job_id: str
    client_id: str
    ad_account_id: str
    name: str
    objective: str
    budget_type: str
    budget_amount: int
    page_id: str
    link_url: str
    image_index: int
    copy_index: int
    pixel_id: str | None = None


class SelectAssetsAndPublishUseCase:
    def __init__(self, job_store: IJobStore, create_campaign: CreateCampaignUseCase):
        self.job_store = job_store
        self.create_campaign = create_campaign

    async def execute(self, cmd: SelectAndPublishCommand) -> Campaign:
        job = await self.job_store.get(cmd.job_id)
        if job is None:
            raise LookupError(f"Inspiration job {cmd.job_id} not found")
        if job.status is not JobStatus.READY:
            raise ValueError(f"Job {cmd.job_id} is not ready (status={job.status})")

        image = job.assets.images[cmd.image_index]
        copy = job.assets.copies[cmd.copy_index]

        return await self.create_campaign.execute(
            CreateCampaignCommand(
                client_id=cmd.client_id,
                ad_account_id=cmd.ad_account_id,
                name=cmd.name,
                objective=cmd.objective,
                budget_type=cmd.budget_type,
                budget_amount=cmd.budget_amount,
                page_id=cmd.page_id,
                pixel_id=cmd.pixel_id,
                image_url=image.url,
                headline=copy.headline,
                body=copy.body,
                cta=copy.cta,
                link_url=cmd.link_url,
            )
        )
