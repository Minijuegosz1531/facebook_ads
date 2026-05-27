"""Application settings loaded from the environment (pydantic-settings)."""
from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    USE_STUBS: bool = True

    # Meta
    META_SYSTEM_USER_TOKEN: str = "stub-token"
    META_BUSINESS_ID: str = "stub-business"

    # IA
    ANTHROPIC_API_KEY: str = "stub-key"
    HF_API_KEY: str = "stub-key"
    HF_API_SECRET: str = "stub-secret"

    # Data
    DATABASE_URL: str = "postgresql+asyncpg://metaads:metaads@localhost:5432/metaads"
    REDIS_URL: str = "redis://localhost:6379"

    # Storage
    GCS_BUCKET_NAME: str = "meta-ads-platform-assets"

    # App
    BASE_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
