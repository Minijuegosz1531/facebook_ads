"""Port: short-lived inspiration job state (implemented by the Redis adapter)."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.inspiration import InspirationJob


class IJobStore(ABC):
    @abstractmethod
    async def save(self, job: InspirationJob) -> None: ...

    @abstractmethod
    async def get(self, job_id: str) -> InspirationJob | None: ...
