"""IAdLibrary implementation backed by the Meta Ad Library API (graph.facebook.com)."""
from __future__ import annotations

from domain.models.inspiration import ReferenceAd
from domain.ports.outbound.ad_library import IAdLibrary

GRAPH_URL = "https://graph.facebook.com/v21.0/ads_archive"


class AdLibraryAdapter(IAdLibrary):
    def __init__(self, access_token: str):
        self._token = access_token

    async def search_top_ads(
        self, keywords: list[str], country: str, platforms: list[str], limit: int = 5
    ) -> list[ReferenceAd]:
        import httpx  # lazy: only needed in non-stub mode

        params = {
            "search_terms": " ".join(keywords),
            "ad_type": "ALL",
            "ad_reached_countries": country,
            "publisher_platforms": ",".join(platforms),
            "ad_active_status": "ACTIVE",
            "fields": "ad_creative_bodies,ad_creative_link_titles,ad_snapshot_url,impressions",
            "sort": "impressions_desc",
            "limit": limit,
            "access_token": self._token,
        }
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(GRAPH_URL, params=params)
            resp.raise_for_status()
            data = resp.json().get("data", [])

        return [
            ReferenceAd(
                body=(ad.get("ad_creative_bodies") or [""])[0],
                title=(ad.get("ad_creative_link_titles") or [""])[0],
                snapshot_url=ad.get("ad_snapshot_url", ""),
                impressions=int((ad.get("impressions") or {}).get("lower_bound", 0) or 0),
            )
            for ad in data
        ]
