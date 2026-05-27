"""Port: ad copy generation (implemented by the Claude adapter)."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.inspiration import Copy, ReferenceAd


class ICopyGenerator(ABC):
    @abstractmethod
    async def extract_keywords(self, description: str) -> list[str]: ...

    @abstractmethod
    async def generate_copies(
        self,
        reference_ads: list[ReferenceAd],
        client_name: str,
        product: str,
        objective: str,
        country: str,
        count: int = 10,
    ) -> list[Copy]: ...
