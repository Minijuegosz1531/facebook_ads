"""IImageGenerator implementation backed by the Higgsfield API."""
from __future__ import annotations

from domain.models.inspiration import ReferenceAd
from domain.ports.outbound.image_generator import IImageGenerator


class HiggsfieldAdapter(IImageGenerator):
    MODEL = "higgsfield-ai/soul/standard"

    def __init__(self, api_key: str, api_secret: str):
        self._api_key = api_key
        self._api_secret = api_secret

    def _build_prompt(self, reference_ads: list[ReferenceAd], product: str, country: str) -> str:
        style_context = " ".join(ad.body[:100] for ad in reference_ads[:3])
        return (
            "Professional Facebook/Instagram ad image. "
            f"Product: {product}. Market: {country} Latin America. "
            "High-contrast, clean background, product hero shot. "
            f"Inspired by top-performing ads: {style_context}. "
            "No text overlays. Photorealistic."
        )

    async def generate(
        self,
        reference_ads: list[ReferenceAd],
        product: str,
        country: str,
        webhook_url: str,
        count: int = 5,
    ) -> list[str]:
        import higgsfield_client  # lazy: only needed in non-stub mode

        prompt = self._build_prompt(reference_ads, product, country)
        request_ids: list[str] = []
        for _ in range(count):
            rc = await higgsfield_client.submit_async(
                self.MODEL,
                arguments={"prompt": prompt, "aspect_ratio": "1:1", "resolution": "1K"},
                webhook_url=webhook_url,
            )
            request_ids.append(rc.request_id)
        return request_ids
