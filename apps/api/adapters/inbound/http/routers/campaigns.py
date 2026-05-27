"""HTTP router for campaigns. Delegates to the application CampaignService."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from adapters.inbound.http.schemas.campaign import (
    CampaignOut,
    CreateCampaignRequest,
    PublishFromJobRequest,
    UpdateStatusRequest,
)
from domain.use_cases.create_campaign import CreateCampaignCommand
from domain.use_cases.select_assets_and_publish import SelectAndPublishCommand
from infrastructure.container import get_container

router = APIRouter()


@router.get("", response_model=list[CampaignOut])
async def list_campaigns(client_id: str = Query(...)):
    container = get_container()
    service = container.campaign_service(ad_account_id="")
    campaigns = await service.list_by_client(client_id)
    return [CampaignOut.from_domain(c) for c in campaigns]


@router.post("", response_model=CampaignOut, status_code=201)
async def create_campaign(req: CreateCampaignRequest):
    container = get_container()
    service = container.campaign_service(ad_account_id=req.ad_account_id)
    campaign = await service.create_campaign(
        CreateCampaignCommand(
            client_id=req.client_id,
            ad_account_id=req.ad_account_id,
            name=req.name,
            objective=req.objective,
            budget_type=req.budget_type,
            budget_amount=req.budget_amount,
            page_id=req.page_id,
            pixel_id=req.pixel_id,
            image_url=req.image_url,
            headline=req.headline,
            body=req.body,
            cta=req.cta,
            link_url=req.link_url,
        )
    )
    return CampaignOut.from_domain(campaign)


@router.post("/publish-from-job", response_model=CampaignOut, status_code=201)
async def publish_from_job(req: PublishFromJobRequest):
    container = get_container()
    service = container.campaign_service(ad_account_id=req.ad_account_id)
    try:
        campaign = await service.publish_from_job(
            SelectAndPublishCommand(
                job_id=req.job_id,
                client_id=req.client_id,
                ad_account_id=req.ad_account_id,
                name=req.name,
                objective=req.objective,
                budget_type=req.budget_type,
                budget_amount=req.budget_amount,
                page_id=req.page_id,
                pixel_id=req.pixel_id,
                link_url=req.link_url,
                image_index=req.image_index,
                copy_index=req.copy_index,
            )
        )
    except (LookupError, ValueError, IndexError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CampaignOut.from_domain(campaign)


@router.get("/{campaign_id}", response_model=CampaignOut)
async def get_campaign(campaign_id: str):
    container = get_container()
    service = container.campaign_service(ad_account_id="")
    campaign = await service.get(campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return CampaignOut.from_domain(campaign)


@router.patch("/{campaign_id}/status", response_model=CampaignOut)
async def update_status(campaign_id: str, req: UpdateStatusRequest):
    container = get_container()
    service = container.campaign_service(ad_account_id="")
    try:
        campaign = await service.update_status(campaign_id, req.status)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return CampaignOut.from_domain(campaign)


@router.get("/{campaign_id}/insights")
async def get_insights(
    campaign_id: str,
    since: str = Query("2026-01-01"),
    until: str = Query("2026-12-31"),
):
    container = get_container()
    service = container.campaign_service(ad_account_id="")
    try:
        return await service.get_insights(campaign_id, since, until)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(campaign_id: str):
    container = get_container()
    service = container.campaign_service(ad_account_id="")
    await service.delete(campaign_id)
