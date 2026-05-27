"""IStorage implementation backed by Google Cloud Storage."""
from __future__ import annotations

from domain.ports.outbound.storage import IStorage


class GCSAdapter(IStorage):
    def __init__(self, bucket_name: str):
        self._bucket_name = bucket_name

    async def store_from_url(self, source_url: str, dest_key: str) -> str:
        import asyncio

        import httpx  # lazy: only needed in non-stub mode
        from google.cloud import storage  # lazy

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(source_url)
            resp.raise_for_status()
            content = resp.content
            content_type = resp.headers.get("content-type", "image/jpeg")

        def _upload() -> str:
            bucket = storage.Client().bucket(self._bucket_name)
            blob = bucket.blob(dest_key)
            blob.upload_from_string(content, content_type=content_type)
            return f"https://storage.googleapis.com/{self._bucket_name}/{dest_key}"

        return await asyncio.to_thread(_upload)
