"""HTTP router for advertiser clients (read-only reference data)."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from infrastructure.container import get_container

router = APIRouter()


class ClientOut(BaseModel):
    id: str
    name: str
    meta_ad_account_id: str
    meta_page_id: str | None
    meta_pixel_id: str | None


@router.get("", response_model=list[ClientOut])
async def list_clients():
    repo = get_container().client_repo
    return [ClientOut(**c.__dict__) for c in await repo.list_all()]


@router.get("/{client_id}", response_model=ClientOut)
async def get_client(client_id: str):
    repo = get_container().client_repo
    client = await repo.get(client_id)
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return ClientOut(**client.__dict__)
