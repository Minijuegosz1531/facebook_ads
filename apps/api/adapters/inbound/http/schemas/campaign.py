"""Pydantic request/response schemas for the campaigns router."""
from __future__ import annotations

from pydantic import BaseModel, Field

from domain.models.campaign import Campaign


class AdOut(BaseModel):
    meta_ad_id: str | None = None
    headline: str
    body: str
    image_url: str
    cta: str
    status: str


class CampaignOut(BaseModel):
    id: str | None
    client_id: str | None
    meta_campaign_id: str | None
    name: str
    objective: str
    budget_type: str
    budget_amount: int
    status: str
    ads: list[AdOut]

    @classmethod
    def from_domain(cls, c: Campaign) -> "CampaignOut":
        return cls(
            id=c.id,
            client_id=c.client_id,
            meta_campaign_id=c.meta_campaign_id,
            name=c.name,
            objective=c.objective,
            budget_type=str(c.budget_type),
            budget_amount=c.budget_amount,
            status=str(c.status),
            ads=[
                AdOut(
                    meta_ad_id=a.meta_ad_id,
                    headline=a.headline,
                    body=a.body,
                    image_url=a.image_url,
                    cta=a.cta,
                    status=str(a.status),
                )
                for a in c.ads
            ],
        )


class CreateCampaignRequest(BaseModel):
    client_id: str
    ad_account_id: str
    name: str = Field(min_length=3, max_length=100)
    objective: str
    budget_type: str = Field(pattern="^(campaign|adset)$")
    budget_amount: int = Field(ge=100)
    page_id: str
    pixel_id: str | None = None
    image_url: str
    headline: str
    body: str
    cta: str
    link_url: str


class PublishFromJobRequest(BaseModel):
    job_id: str
    client_id: str
    ad_account_id: str
    name: str = Field(min_length=3, max_length=100)
    objective: str
    budget_type: str = Field(pattern="^(campaign|adset)$")
    budget_amount: int = Field(ge=100)
    page_id: str
    pixel_id: str | None = None
    link_url: str
    image_index: int = 0
    copy_index: int = 0


class UpdateStatusRequest(BaseModel):
    status: str = Field(pattern="^(ACTIVE|PAUSED|ARCHIVED)$")
