"""Inbound port: what the outside world can ask of the campaign domain."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.campaign import Campaign
from domain.use_cases.create_campaign import CreateCampaignCommand


class ICampaignService(ABC):
    @abstractmethod
    async def create_campaign(self, cmd: CreateCampaignCommand) -> Campaign: ...

    @abstractmethod
    async def update_status(self, campaign_id: str, status: str) -> Campaign: ...

    @abstractmethod
    async def get(self, campaign_id: str) -> Campaign | None: ...

    @abstractmethod
    async def list_by_client(self, client_id: str) -> list[Campaign]: ...

    @abstractmethod
    async def get_insights(self, campaign_id: str, since: str, until: str) -> dict: ...

    @abstractmethod
    async def delete(self, campaign_id: str) -> None: ...
