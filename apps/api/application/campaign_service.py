"""Application service orchestrating the campaign use cases."""
from __future__ import annotations

from domain.models.campaign import Campaign
from domain.ports.inbound.campaign_service import ICampaignService
from domain.ports.outbound.ad_platform import IAdPlatform
from domain.ports.outbound.campaign_repository import ICampaignRepository
from domain.ports.outbound.job_store import IJobStore
from domain.use_cases.create_campaign import CreateCampaignCommand, CreateCampaignUseCase
from domain.use_cases.get_insights import GetInsightsUseCase
from domain.use_cases.select_assets_and_publish import (
    SelectAndPublishCommand,
    SelectAssetsAndPublishUseCase,
)
from domain.use_cases.update_campaign_status import UpdateCampaignStatusUseCase


class CampaignService(ICampaignService):
    def __init__(
        self,
        ad_platform: IAdPlatform,
        campaign_repo: ICampaignRepository,
        job_store: IJobStore | None = None,
    ):
        self._repo = campaign_repo
        self._create = CreateCampaignUseCase(ad_platform, campaign_repo)
        self._update_status = UpdateCampaignStatusUseCase(ad_platform, campaign_repo)
        self._insights = GetInsightsUseCase(ad_platform, campaign_repo)
        self._publish = (
            SelectAssetsAndPublishUseCase(job_store, self._create)
            if job_store is not None
            else None
        )

    async def create_campaign(self, cmd: CreateCampaignCommand) -> Campaign:
        return await self._create.execute(cmd)

    async def publish_from_job(self, cmd: SelectAndPublishCommand) -> Campaign:
        if self._publish is None:
            raise RuntimeError("CampaignService was built without a job store")
        return await self._publish.execute(cmd)

    async def update_status(self, campaign_id: str, status: str) -> Campaign:
        return await self._update_status.execute(campaign_id, status)

    async def get(self, campaign_id: str) -> Campaign | None:
        return await self._repo.get(campaign_id)

    async def list_by_client(self, client_id: str) -> list[Campaign]:
        return await self._repo.list_by_client(client_id)

    async def get_insights(self, campaign_id: str, since: str, until: str) -> dict:
        return await self._insights.execute(campaign_id, since, until)

    async def delete(self, campaign_id: str) -> None:
        await self._repo.delete(campaign_id)
