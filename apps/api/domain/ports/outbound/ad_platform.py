"""Port: the advertising platform (implemented by the Meta Ads CLI adapter)."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.campaign import Ad, Adset, Campaign, Creative


class AdPlatformError(Exception):
    """Raised when the underlying ad platform fails."""


class IAdPlatform(ABC):
    @abstractmethod
    async def create_campaign(self, name: str, objective: str, budget: int | None) -> Campaign: ...

    @abstractmethod
    async def create_adset(self, campaign_id: str, config: dict) -> Adset: ...

    @abstractmethod
    async def create_creative(self, config: dict) -> Creative: ...

    @abstractmethod
    async def create_ad(self, adset_id: str, creative_id: str) -> Ad: ...

    @abstractmethod
    async def update_status(self, object_type: str, object_id: str, status: str) -> None: ...

    @abstractmethod
    async def get_insights(
        self, campaign_id: str, fields: list[str], since: str, until: str
    ) -> dict: ...
