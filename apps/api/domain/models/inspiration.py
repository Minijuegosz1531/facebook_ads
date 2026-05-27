"""Pure domain entities for the AI inspiration pipeline."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum


class JobStatus(StrEnum):
    PENDING = "pending"
    SEARCHING = "searching"
    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"


@dataclass
class ReferenceAd:
    body: str = ""
    title: str = ""
    snapshot_url: str = ""
    impressions: int = 0


@dataclass
class GeneratedImage:
    url: str
    request_id: str | None = None


@dataclass
class Copy:
    headline: str
    body: str
    cta: str


@dataclass
class GeneratedAssets:
    images: list[GeneratedImage] = field(default_factory=list)
    copies: list[Copy] = field(default_factory=list)


@dataclass
class InspirationJob:
    id: str
    client_id: str
    keywords: list[str] = field(default_factory=list)
    country: str = ""
    platforms: list[str] = field(default_factory=list)
    status: JobStatus = JobStatus.PENDING
    reference_ads: list[ReferenceAd] = field(default_factory=list)
    assets: GeneratedAssets = field(default_factory=GeneratedAssets)
    higgsfield_request_ids: list[str] = field(default_factory=list)
    error: str | None = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
