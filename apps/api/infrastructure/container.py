"""Dependency injection: the ONLY place that constructs concrete adapters.

Picks stub or real adapters based on settings.USE_STUBS. The domain and
application layers never import anything from here.
"""
from __future__ import annotations

from functools import lru_cache

from application.campaign_service import CampaignService
from application.inspiration_service import InspirationService
from config import Settings, get_settings
from domain.ports.outbound.ad_library import IAdLibrary
from domain.ports.outbound.campaign_repository import ICampaignRepository
from domain.ports.outbound.client_repository import IClientRepository
from domain.ports.outbound.copy_generator import ICopyGenerator
from domain.ports.outbound.image_generator import IImageGenerator
from domain.ports.outbound.job_store import IJobStore


class Container:
    """Holds singletons shared across requests/workers."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.campaign_repo: ICampaignRepository = self._build_campaign_repo()
        self.client_repo: IClientRepository = self._build_client_repo()
        self.job_store: IJobStore = self._build_job_store()
        self.ad_library: IAdLibrary = self._build_ad_library()
        self.image_generator: IImageGenerator = self._build_image_generator()
        self.copy_generator: ICopyGenerator = self._build_copy_generator()

    # ── outbound adapters ────────────────────────────────────────────────
    def _build_campaign_repo(self) -> ICampaignRepository:
        if self.settings.USE_STUBS:
            from adapters.outbound.stubs import InMemoryCampaignRepository

            return InMemoryCampaignRepository()
        from adapters.outbound.postgres_repository import PostgresCampaignRepository

        return PostgresCampaignRepository(self.settings.DATABASE_URL)

    def _build_client_repo(self) -> IClientRepository:
        # Clients are reference data; seeded in-memory for the scaffold.
        from adapters.outbound.stubs import InMemoryClientRepository

        return InMemoryClientRepository()

    def _build_job_store(self) -> IJobStore:
        if self.settings.USE_STUBS:
            from adapters.outbound.stubs import InMemoryJobStore

            return InMemoryJobStore()
        from adapters.outbound.redis_job_store import RedisJobStore

        return RedisJobStore(self.settings.REDIS_URL)

    def _build_ad_library(self) -> IAdLibrary:
        if self.settings.USE_STUBS:
            from adapters.outbound.stubs import StubAdLibrary

            return StubAdLibrary()
        from adapters.outbound.ad_library_adapter import AdLibraryAdapter

        return AdLibraryAdapter(self.settings.META_SYSTEM_USER_TOKEN)

    def _build_image_generator(self) -> IImageGenerator:
        if self.settings.USE_STUBS:
            from adapters.outbound.stubs import StubImageGenerator

            return StubImageGenerator()
        from adapters.outbound.higgsfield_adapter import HiggsfieldAdapter

        return HiggsfieldAdapter(self.settings.HF_API_KEY, self.settings.HF_API_SECRET)

    def _build_copy_generator(self) -> ICopyGenerator:
        if self.settings.USE_STUBS:
            from adapters.outbound.stubs import StubCopyGenerator

            return StubCopyGenerator()
        from adapters.outbound.claude_adapter import ClaudeAdapter

        return ClaudeAdapter(self.settings.ANTHROPIC_API_KEY)

    # ── inbound services ─────────────────────────────────────────────────
    def campaign_service(self, ad_account_id: str) -> CampaignService:
        """Per-request: the CLI adapter is bound to the client's ad_account_id."""
        if self.settings.USE_STUBS:
            from adapters.outbound.stubs import StubAdPlatform

            ad_platform = StubAdPlatform()
        else:
            from adapters.outbound.meta_cli_adapter import MetaCLIAdapter

            ad_platform = MetaCLIAdapter(
                access_token=self.settings.META_SYSTEM_USER_TOKEN,
                ad_account_id=ad_account_id,
            )
        return CampaignService(
            ad_platform=ad_platform,
            campaign_repo=self.campaign_repo,
            job_store=self.job_store,
        )

    def inspiration_service(self) -> InspirationService:
        return InspirationService(
            ad_library=self.ad_library,
            image_generator=self.image_generator,
            copy_generator=self.copy_generator,
            job_store=self.job_store,
        )


@lru_cache
def get_container() -> Container:
    return Container()
