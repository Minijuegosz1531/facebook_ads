"""Application service orchestrating the inspiration pipeline."""
from __future__ import annotations

from domain.models.inspiration import InspirationJob, JobStatus
from domain.ports.inbound.inspiration_service import IInspirationService
from domain.ports.outbound.ad_library import IAdLibrary
from domain.ports.outbound.copy_generator import ICopyGenerator
from domain.ports.outbound.image_generator import IImageGenerator
from domain.ports.outbound.job_store import IJobStore
from domain.use_cases.generate_inspiration import (
    GenerateInspirationCommand,
    GenerateInspirationUseCase,
)


class InspirationService(IInspirationService):
    def __init__(
        self,
        ad_library: IAdLibrary,
        image_generator: IImageGenerator,
        copy_generator: ICopyGenerator,
        job_store: IJobStore,
    ):
        self._job_store = job_store
        self._pending: dict[str, GenerateInspirationCommand] = {}
        self._use_case = GenerateInspirationUseCase(
            ad_library, image_generator, copy_generator, job_store
        )

    async def start(self, cmd: GenerateInspirationCommand) -> InspirationJob:
        job = InspirationJob(
            id=cmd.job_id,
            client_id=cmd.client_id,
            country=cmd.country,
            platforms=cmd.platforms,
            status=JobStatus.PENDING,
        )
        await self._job_store.save(job)
        self._pending[cmd.job_id] = cmd
        return job

    async def run(self, job_id: str) -> InspirationJob:
        cmd = self._pending.pop(job_id, None)
        if cmd is None:
            raise LookupError(f"No pending command for job {job_id}")
        return await self._use_case.execute(cmd)

    async def run_command(self, cmd: GenerateInspirationCommand) -> InspirationJob:
        """Worker entrypoint: run the pipeline directly from a serialized command."""
        return await self._use_case.execute(cmd)

    async def get(self, job_id: str) -> InspirationJob | None:
        return await self._job_store.get(job_id)
