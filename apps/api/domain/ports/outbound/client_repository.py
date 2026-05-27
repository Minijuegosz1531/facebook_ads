"""Port: read access to advertiser clients."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.client import Client


class IClientRepository(ABC):
    @abstractmethod
    async def list_all(self) -> list[Client]: ...

    @abstractmethod
    async def get(self, client_id: str) -> Client | None: ...
