"""Pure domain entities for the advertising side. No external dependencies."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum


class CampaignStatus(StrEnum):
    PAUSED = "PAUSED"
    ACTIVE = "ACTIVE"
    ARCHIVED = "ARCHIVED"


class BudgetType(StrEnum):
    CAMPAIGN = "campaign"  # CBO — budget at campaign level
    ADSET = "adset"


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class Creative:
    page_id: str
    image_url: str
    headline: str
    body: str
    cta: str
    link_url: str
    meta_creative_id: str | None = None


@dataclass
class Adset:
    campaign_id: str
    meta_adset_id: str | None = None
    budget: int | None = None
    pixel_id: str | None = None


@dataclass
class Ad:
    id: str | None = None
    campaign_id: str | None = None
    meta_ad_id: str | None = None
    meta_creative_id: str | None = None
    headline: str = ""
    body: str = ""
    image_url: str = ""
    cta: str = ""
    status: CampaignStatus = CampaignStatus.PAUSED


@dataclass
class Campaign:
    id: str | None = None
    client_id: str | None = None
    meta_campaign_id: str | None = None
    meta_adset_id: str | None = None
    meta_ad_id: str | None = None
    meta_creative_id: str | None = None
    name: str = ""
    objective: str = ""
    budget_type: BudgetType = BudgetType.CAMPAIGN
    budget_amount: int = 0  # cents
    status: CampaignStatus = CampaignStatus.PAUSED
    ads: list[Ad] = field(default_factory=list)
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)
