"""IAdPlatform implementation backed by the Meta Ads CLI (subprocess)."""
from __future__ import annotations

import asyncio
import json
import os
import subprocess

from domain.models.campaign import Ad, Adset, Campaign, Creative
from domain.ports.outbound.ad_platform import AdPlatformError, IAdPlatform


class MetaCLIAdapter(IAdPlatform):
    def __init__(self, access_token: str, ad_account_id: str):
        self._env = {
            **os.environ,
            "ACCESS_TOKEN": access_token,
            "AD_ACCOUNT_ID": ad_account_id,
        }

    async def _run(self, *args: str) -> dict:
        return await asyncio.to_thread(self._run_sync, *args)

    def _run_sync(self, *args: str) -> dict:
        result = subprocess.run(
            ["meta", "--output", "json", "--no-input", *args],
            env=self._env,
            capture_output=True,
            text=True,
            timeout=60,
        )
        if result.returncode != 0:
            raise AdPlatformError(result.stderr)
        return json.loads(result.stdout)

    async def create_campaign(self, name: str, objective: str, budget: int | None) -> Campaign:
        args = [
            "ads", "campaign", "create",
            "--name", name, "--objective", objective, "--status", "PAUSED",
        ]
        if budget:
            args += ["--daily-budget", str(budget)]
        data = await self._run(*args)
        return Campaign(meta_campaign_id=data["id"], name=name, objective=objective)

    async def create_adset(self, campaign_id: str, config: dict) -> Adset:
        args = ["ads", "adset", "create", "--campaign-id", campaign_id, "--status", "PAUSED"]
        if config.get("budget"):
            args += ["--daily-budget", str(config["budget"])]
        if config.get("pixel_id"):
            args += ["--pixel-id", config["pixel_id"]]
        data = await self._run(*args)
        return Adset(
            campaign_id=campaign_id,
            meta_adset_id=data["id"],
            budget=config.get("budget"),
            pixel_id=config.get("pixel_id"),
        )

    async def create_creative(self, config: dict) -> Creative:
        data = await self._run(
            "ads", "creative", "create",
            "--page-id", config["page_id"],
            "--image-url", config["image_url"],
            "--headline", config["headline"],
            "--body", config["body"],
            "--cta", config["cta"],
            "--link-url", config["link_url"],
        )
        return Creative(
            page_id=config["page_id"],
            image_url=config["image_url"],
            headline=config["headline"],
            body=config["body"],
            cta=config["cta"],
            link_url=config["link_url"],
            meta_creative_id=data["id"],
        )

    async def create_ad(self, adset_id: str, creative_id: str) -> Ad:
        data = await self._run(
            "ads", "ad", "create",
            "--adset-id", adset_id, "--creative-id", creative_id, "--status", "PAUSED",
        )
        return Ad(meta_ad_id=data["id"], meta_creative_id=creative_id)

    async def update_status(self, object_type: str, object_id: str, status: str) -> None:
        await self._run("ads", object_type, "update", object_id, "--status", status)

    async def get_insights(
        self, campaign_id: str, fields: list[str], since: str, until: str
    ) -> dict:
        return await self._run(
            "ads", "campaign", "insights", campaign_id,
            "--fields", ",".join(fields),
            "--since", since, "--until", until,
        )
