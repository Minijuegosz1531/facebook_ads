"""Port: ad image generation (implemented by the Higgsfield adapter)."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.inspiration import ReferenceAd


class IImageGenerator(ABC):
    @abstractmethod
    async def generate(
        self,
        reference_ads: list[ReferenceAd],
        product: str,
        country: str,
        webhook_url: str,
        count: int = 5,
    ) -> list[str]:
        """Kick off async image generation; return provider request ids."""
        ...
