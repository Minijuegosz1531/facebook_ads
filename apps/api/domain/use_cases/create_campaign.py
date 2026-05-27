"""Use case: create a full campaign (campaign + adset + creative + ad) in PAUSED state."""
from __future__ import annotations

from dataclasses import dataclass

from domain.models.campaign import Ad, BudgetType, Campaign, CampaignStatus
from domain.ports.outbound.ad_platform import IAdPlatform
from domain.ports.outbound.campaign_repository import ICampaignRepository


@dataclass
class CreateCampaignCommand:
    client_id: str
    ad_account_id: str
    name: str
    objective: str
    budget_type: str  # "campaign" | "adset"
    budget_amount: int
    page_id: str
    image_url: str
    headline: str
    body: str
    cta: str
    link_url: str
    pixel_id: str | None = None


class CreateCampaignUseCase:
    def __init__(self, ad_platform: IAdPlatform, campaign_repo: ICampaignRepository):
        self.ad_platform = ad_platform
        self.campaign_repo = campaign_repo

    async def execute(self, cmd: CreateCampaignCommand) -> Campaign:
        is_cbo = cmd.budget_type == BudgetType.CAMPAIGN

        campaign = await self.ad_platform.create_campaign(
            name=cmd.name,
            objective=cmd.objective,
            budget=cmd.budget_amount if is_cbo else None,
        )
        adset = await self.ad_platform.create_adset(
            campaign.meta_campaign_id or "",
            {
                "budget": None if is_cbo else cmd.budget_amount,
                "pixel_id": cmd.pixel_id,
            },
        )
        creative = await self.ad_platform.create_creative(
            {
                "page_id": cmd.page_id,
                "image_url": cmd.image_url,
                "headline": cmd.headline,
                "body": cmd.body,
                "cta": cmd.cta,
                "link_url": cmd.link_url,
            }
        )
        ad = await self.ad_platform.create_ad(
            adset.meta_adset_id or "", creative.meta_creative_id or ""
        )

        return await self.campaign_repo.save(
            Campaign(
                client_id=cmd.client_id,
                meta_campaign_id=campaign.meta_campaign_id,
                meta_adset_id=adset.meta_adset_id,
                meta_ad_id=ad.meta_ad_id,
                meta_creative_id=creative.meta_creative_id,
                name=cmd.name,
                objective=cmd.objective,
                budget_type=BudgetType(cmd.budget_type),
                budget_amount=cmd.budget_amount,
                status=CampaignStatus.PAUSED,
                ads=[
                    Ad(
                        meta_ad_id=ad.meta_ad_id,
                        meta_creative_id=creative.meta_creative_id,
                        headline=cmd.headline,
                        body=cmd.body,
                        image_url=cmd.image_url,
                        cta=cmd.cta,
                        status=CampaignStatus.PAUSED,
                    )
                ],
            )
        )
