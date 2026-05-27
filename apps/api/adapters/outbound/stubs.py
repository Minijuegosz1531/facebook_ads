"""In-memory / deterministic stub adapters.

Selected by the container when USE_STUBS=true so the whole API runs end-to-end
with no Postgres, Redis, Meta CLI, Higgsfield or Anthropic credentials. Used by
local dev and by the web app's E2E mocks.
"""
from __future__ import annotations

import uuid

from domain.models.campaign import Ad, Adset, Campaign, CampaignStatus, Creative
from domain.models.client import Client
from domain.models.inspiration import Copy, InspirationJob, ReferenceAd
from domain.ports.outbound.ad_library import IAdLibrary
from domain.ports.outbound.ad_platform import IAdPlatform
from domain.ports.outbound.campaign_repository import ICampaignRepository
from domain.ports.outbound.client_repository import IClientRepository
from domain.ports.outbound.copy_generator import ICopyGenerator
from domain.ports.outbound.image_generator import IImageGenerator
from domain.ports.outbound.job_store import IJobStore
from domain.ports.outbound.storage import IStorage

SEED_CLIENTS = [
    Client(
        id="11111111-1111-1111-1111-111111111111",
        name="Cafetería Andina",
        meta_ad_account_id="act_1001",
        meta_page_id="page_1001",
        meta_pixel_id="pixel_1001",
    ),
    Client(
        id="22222222-2222-2222-2222-222222222222",
        name="Moda Tropical",
        meta_ad_account_id="act_1002",
        meta_page_id="page_1002",
        meta_pixel_id="pixel_1002",
    ),
]


def _fake_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class InMemoryCampaignRepository(ICampaignRepository):
    def __init__(self) -> None:
        self._store: dict[str, Campaign] = {}

    async def save(self, campaign: Campaign) -> Campaign:
        if campaign.id is None:
            campaign.id = str(uuid.uuid4())
        self._store[campaign.id] = campaign
        return campaign

    async def get(self, campaign_id: str) -> Campaign | None:
        return self._store.get(campaign_id)

    async def list_by_client(self, client_id: str) -> list[Campaign]:
        return [c for c in self._store.values() if c.client_id == client_id]

    async def update_status(self, campaign_id: str, status: str) -> Campaign | None:
        campaign = self._store.get(campaign_id)
        if campaign is None:
            return None
        campaign.status = CampaignStatus(status)
        for ad in campaign.ads:
            ad.status = CampaignStatus(status)
        return campaign

    async def delete(self, campaign_id: str) -> None:
        self._store.pop(campaign_id, None)


class InMemoryJobStore(IJobStore):
    def __init__(self) -> None:
        self._store: dict[str, InspirationJob] = {}

    async def save(self, job: InspirationJob) -> None:
        self._store[job.id] = job

    async def get(self, job_id: str) -> InspirationJob | None:
        return self._store.get(job_id)


class StubAdPlatform(IAdPlatform):
    async def create_campaign(self, name: str, objective: str, budget: int | None) -> Campaign:
        return Campaign(meta_campaign_id=_fake_id("camp"), name=name, objective=objective)

    async def create_adset(self, campaign_id: str, config: dict) -> Adset:
        return Adset(
            campaign_id=campaign_id,
            meta_adset_id=_fake_id("adset"),
            budget=config.get("budget"),
            pixel_id=config.get("pixel_id"),
        )

    async def create_creative(self, config: dict) -> Creative:
        return Creative(
            page_id=config["page_id"],
            image_url=config["image_url"],
            headline=config["headline"],
            body=config["body"],
            cta=config["cta"],
            link_url=config["link_url"],
            meta_creative_id=_fake_id("creative"),
        )

    async def create_ad(self, adset_id: str, creative_id: str) -> Ad:
        return Ad(
            meta_ad_id=_fake_id("ad"),
            meta_creative_id=creative_id,
            status=CampaignStatus.PAUSED,
        )

    async def update_status(self, object_type: str, object_id: str, status: str) -> None:
        return None

    async def get_insights(
        self, campaign_id: str, fields: list[str], since: str, until: str
    ) -> dict:
        return {
            "data": [
                {
                    "impressions": 12450,
                    "clicks": 312,
                    "spend": 84.20,
                    "ctr": 2.51,
                    "cpc": 0.27,
                    "reach": 9810,
                    "date_start": since,
                    "date_stop": until,
                }
            ]
        }


class StubAdLibrary(IAdLibrary):
    async def search_top_ads(
        self, keywords: list[str], country: str, platforms: list[str], limit: int = 5
    ) -> list[ReferenceAd]:
        kw = " ".join(keywords) or "producto"
        return [
            ReferenceAd(
                body=f"Descubre {kw} — oferta por tiempo limitado #{i + 1}",
                title=f"{kw.title()} {i + 1}",
                snapshot_url=f"https://facebook.com/ads/library/?id=stub{i}",
                impressions=100_000 - i * 7_500,
            )
            for i in range(limit)
        ]


class StubImageGenerator(IImageGenerator):
    async def generate(
        self,
        reference_ads: list[ReferenceAd],
        product: str,
        country: str,
        webhook_url: str,
        count: int = 5,
    ) -> list[str]:
        # Stub returns ready-to-use https URLs; real adapter returns opaque
        # request ids and the webhook fills the URLs in later.
        seed = product.replace(" ", "-").lower() or "ad"
        return [
            f"https://picsum.photos/seed/{seed}-{i}/600/600" for i in range(count)
        ]


class StubCopyGenerator(ICopyGenerator):
    async def extract_keywords(self, description: str) -> list[str]:
        words = [w.strip(".,;:").lower() for w in description.split() if len(w) > 4]
        return words[:5] or ["producto", "oferta", "calidad"]

    async def generate_copies(
        self,
        reference_ads: list[ReferenceAd],
        client_name: str,
        product: str,
        objective: str,
        country: str,
        count: int = 10,
    ) -> list[Copy]:
        ctas = ["SHOP_NOW", "LEARN_MORE", "SIGN_UP", "GET_OFFER"]
        return [
            Copy(
                headline=f"{product} para {country} — opción {i + 1}",
                body=f"{client_name}: lo que buscabas en {product}. ¡Aprovecha hoy!",
                cta=ctas[i % len(ctas)],
            )
            for i in range(count)
        ]


class StubStorage(IStorage):
    async def store_from_url(self, source_url: str, dest_key: str) -> str:
        # No download in stub mode; the source URL is already permanent.
        return source_url


class InMemoryClientRepository(IClientRepository):
    def __init__(self) -> None:
        self._clients = {c.id: c for c in SEED_CLIENTS}

    async def list_all(self) -> list[Client]:
        return list(self._clients.values())

    async def get(self, client_id: str) -> Client | None:
        return self._clients.get(client_id)
