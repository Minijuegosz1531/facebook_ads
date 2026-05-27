"""Port: persistence for campaigns."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.campaign import Campaign


class ICampaignRepository(ABC):
    @abstractmethod
    async def save(self, campaign: Campaign) -> Campaign: ...

    @abstractmethod
    async def get(self, campaign_id: str) -> Campaign | None: ...

    @abstractmethod
    async def list_by_client(self, client_id: str) -> list[Campaign]: ...

    @abstractmethod
    async def update_status(self, campaign_id: str, status: str) -> Campaign | None: ...

    @abstractmethod
    async def delete(self, campaign_id: str) -> None: ...
