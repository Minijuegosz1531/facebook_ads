"""arq Redis pool helpers for enqueuing jobs (non-stub mode)."""
from __future__ import annotations

from config import get_settings


def redis_settings():
    """Build arq RedisSettings from the configured REDIS_URL."""
    from arq.connections import RedisSettings

    return RedisSettings.from_dsn(get_settings().REDIS_URL)


async def get_arq_pool():
    """FastAPI dependency: a shared arq Redis pool for enqueuing jobs."""
    from arq import create_pool

    pool = await create_pool(redis_settings())
    try:
        yield pool
    finally:
        await pool.aclose()
