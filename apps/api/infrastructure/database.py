"""SQLAlchemy async engine helpers (non-stub mode only)."""
from __future__ import annotations

from config import get_settings


async def init_schema() -> None:
    """Create tables if they don't exist. No-op in stub mode."""
    settings = get_settings()
    if settings.USE_STUBS:
        return
    from adapters.outbound.postgres_repository import PostgresCampaignRepository

    repo = PostgresCampaignRepository(settings.DATABASE_URL)
    await repo.create_schema()
