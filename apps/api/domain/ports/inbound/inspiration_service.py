"""Inbound port: what the outside world can ask of the inspiration domain."""
from __future__ import annotations

from abc import ABC, abstractmethod

from domain.models.inspiration import InspirationJob
from domain.use_cases.generate_inspiration import GenerateInspirationCommand


class IInspirationService(ABC):
    @abstractmethod
    async def start(self, cmd: GenerateInspirationCommand) -> InspirationJob: ...

    @abstractmethod
    async def run(self, job_id: str) -> InspirationJob:
        """Execute the full pipeline for an already-created job (worker entry)."""
        ...

    @abstractmethod
    async def get(self, job_id: str) -> InspirationJob | None: ...
