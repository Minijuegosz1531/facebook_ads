"""Pure domain entity for an advertiser client."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Client:
    id: str
    name: str
    meta_ad_account_id: str  # act_123456789
    meta_page_id: str | None = None
    meta_pixel_id: str | None = None
