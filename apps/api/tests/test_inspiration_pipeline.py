from adapters.outbound.stubs import (
    InMemoryJobStore,
    StubAdLibrary,
    StubCopyGenerator,
    StubImageGenerator,
)
from domain.models.inspiration import JobStatus
from domain.use_cases.generate_inspiration import (
    GenerateInspirationCommand,
    GenerateInspirationUseCase,
)


async def test_pipeline_produces_ready_job_with_images_and_copies():
    job_store = InMemoryJobStore()
    use_case = GenerateInspirationUseCase(
        StubAdLibrary(), StubImageGenerator(), StubCopyGenerator(), job_store
    )
    cmd = GenerateInspirationCommand(
        job_id="job-1",
        client_id="client-1",
        client_name="Cafetería Andina",
        product="café de especialidad",
        description="Campaña para promocionar café de especialidad colombiano premium",
        objective="OUTCOME_SALES",
        country="CO",
        webhook_base_url="http://localhost:8000",
        image_count=5,
        copy_count=10,
    )

    job = await use_case.execute(cmd)

    assert job.status is JobStatus.READY
    assert len(job.assets.images) == 5
    assert len(job.assets.copies) == 10
    assert job.keywords  # keywords were extracted
    assert (await job_store.get("job-1")).status is JobStatus.READY
