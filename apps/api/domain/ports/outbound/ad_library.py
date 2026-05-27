"""Port: market research via the Meta Ad Library API."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.inspiration import ReferenceAd


class IAdLibrary(ABC):
    @abstractmethod
    async def search_top_ads(
        self, keywords: list[str], country: str, platforms: list[str], limit: int = 5
    ) -> list[ReferenceAd]: ...
