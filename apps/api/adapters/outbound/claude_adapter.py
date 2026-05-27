"""ICopyGenerator implementation backed by the Claude API (Anthropic)."""
from __future__ import annotations

import json

from domain.models.inspiration import Copy, ReferenceAd
from domain.ports.outbound.copy_generator import ICopyGenerator

MODEL = "claude-sonnet-4-6"

_COPYWRITER_SYSTEM = (
    "Eres experto en copywriting para Facebook Ads en Latinoamérica. "
    "Respondes SIEMPRE en JSON válido, sin markdown ni backticks."
)


class ClaudeAdapter(ICopyGenerator):
    def __init__(self, api_key: str):
        self._api_key = api_key

    def _client(self):
        from anthropic import AsyncAnthropic  # lazy: only needed in non-stub mode

        return AsyncAnthropic(api_key=self._api_key)

    async def extract_keywords(self, description: str) -> list[str]:
        client = self._client()
        resp = await client.messages.create(
            model=MODEL,
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Extrae 3-5 keywords publicitarias de esta descripción de campaña. "
                        'Responde SOLO JSON: {"keywords": ["...", "..."]}\n\n'
                        f"Descripción: {description}"
                    ),
                }
            ],
        )
        return json.loads(resp.content[0].text)["keywords"]

    async def generate_copies(
        self,
        reference_ads: list[ReferenceAd],
        client_name: str,
        product: str,
        objective: str,
        country: str,
        count: int = 10,
    ) -> list[Copy]:
        client = self._client()
        refs = json.dumps(
            [{"body": a.body, "title": a.title} for a in reference_ads],
            ensure_ascii=False,
        )
        resp = await client.messages.create(
            model=MODEL,
            max_tokens=2000,
            system=[
                {
                    "type": "text",
                    "text": _COPYWRITER_SYSTEM,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Top {len(reference_ads)} anuncios con más impresiones:\n{refs}\n\n"
                        f"Cliente: {client_name}\nProducto: {product}\n"
                        f"Objetivo: {objective}\nPaís: {country}\n\n"
                        f"Genera {count} copies superando el engagement de los de referencia.\n"
                        '{"copies": [{"headline": "...", "body": "...", "cta": "SHOP_NOW"}]}'
                    ),
                }
            ],
        )
        raw = json.loads(resp.content[0].text)["copies"]
        return [Copy(headline=c["headline"], body=c["body"], cta=c["cta"]) for c in raw]
