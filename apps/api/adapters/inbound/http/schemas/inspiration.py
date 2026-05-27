"""Pydantic request/response schemas for the inspiration router."""
from __future__ import annotations

from pydantic import BaseModel, Field

from domain.models.inspiration import InspirationJob


class StartInspirationRequest(BaseModel):
    client_id: str
    client_name: str
    product: str
    description: str = Field(min_length=10, max_length=500)
    objective: str
    country: str = Field(min_length=2, max_length=2)
    platforms: list[str] = Field(default_factory=lambda: ["facebook", "instagram"])
    image_count: int = 5
    copy_count: int = 10


class JobOut(BaseModel):
    job_id: str
    status: str
    keywords: list[str]
    generated_images: list[str]
    generated_copies: list[dict]
    error: str | None = None

    @classmethod
    def from_domain(cls, job: InspirationJob) -> "JobOut":
        return cls(
            job_id=job.id,
            status=str(job.status),
            keywords=job.keywords,
            generated_images=[img.url for img in job.assets.images],
            generated_copies=[
                {"headline": c.headline, "body": c.body, "cta": c.cta}
                for c in job.assets.copies
            ],
            error=job.error,
        )
