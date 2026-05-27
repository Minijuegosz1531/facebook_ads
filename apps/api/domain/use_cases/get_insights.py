"""Use case: fetch performance insights for a campaign."""
from __future__ import annotations

from domain.ports.outbound.ad_platform import IAdPlatform
from domain.ports.outbound.campaign_repository import ICampaignRepository

DEFAULT_FIELDS = ["impressions", "clicks", "spend", "ctr", "cpc", "reach"]


class GetInsightsUseCase:
    def __init__(self, ad_platform: IAdPlatform, campaign_repo: ICampaignRepository):
        self.ad_platform = ad_platform
        self.campaign_repo = campaign_repo

    async def execute(self, campaign_id: str, since: str, until: str) -> dict:
        campaign = await self.campaign_repo.get(campaign_id)
        if campaign is None:
            raise LookupError(f"Campaign {campaign_id} not found")
        if not campaign.meta_campaign_id:
            return {"data": []}
        return await self.ad_platform.get_insights(
            campaign.meta_campaign_id, DEFAULT_FIELDS, since, until
        )
