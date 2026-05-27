"""Use case: activate / pause / archive a campaign on the platform and in storage."""
from __future__ import annotations

from domain.models.campaign import Campaign, CampaignStatus
from domain.ports.outbound.ad_platform import IAdPlatform
from domain.ports.outbound.campaign_repository import ICampaignRepository


class UpdateCampaignStatusUseCase:
    def __init__(self, ad_platform: IAdPlatform, campaign_repo: ICampaignRepository):
        self.ad_platform = ad_platform
        self.campaign_repo = campaign_repo

    async def execute(self, campaign_id: str, status: str) -> Campaign:
        new_status = CampaignStatus(status)
        campaign = await self.campaign_repo.get(campaign_id)
        if campaign is None:
            raise LookupError(f"Campaign {campaign_id} not found")

        if campaign.meta_campaign_id:
            await self.ad_platform.update_status(
                "campaign", campaign.meta_campaign_id, new_status
            )

        updated = await self.campaign_repo.update_status(campaign_id, new_status)
        assert updated is not None
        return updated
