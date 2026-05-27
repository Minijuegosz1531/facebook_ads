"""Port: permanent asset storage (implemented by the GCS adapter)."""
from __future__ import annotations

from abc import ABC, abstractmethod


class IStorage(ABC):
    @abstractmethod
    async def store_from_url(self, source_url: str, dest_key: str) -> str:
        """Download `source_url` and persist it; return the permanent public URL."""
        ...
