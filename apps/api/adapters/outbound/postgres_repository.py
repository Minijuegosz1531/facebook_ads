"""ICampaignRepository implementation backed by PostgreSQL via SQLAlchemy 2.0 async.

Imported only in non-stub mode, so SQLAlchemy is a hard import here.
"""
from __future__ import annotations

import uuid

from sqlalchemy import JSON, String, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from domain.models.campaign import Ad, BudgetType, Campaign, CampaignStatus


class Base(DeclarativeBase):
    pass


class CampaignRow(Base):
    __tablename__ = "campaigns"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    client_id: Mapped[str] = mapped_column(String, index=True)
    meta_campaign_id: Mapped[str | None] = mapped_column(String, nullable=True)
    meta_adset_id: Mapped[str | None] = mapped_column(String, nullable=True)
    meta_ad_id: Mapped[str | None] = mapped_column(String, nullable=True)
    meta_creative_id: Mapped[str | None] = mapped_column(String, nullable=True)
    name: Mapped[str] = mapped_column(String)
    objective: Mapped[str] = mapped_column(String)
    budget_type: Mapped[str] = mapped_column(String)
    budget_amount: Mapped[int] = mapped_column(default=0)
    status: Mapped[str] = mapped_column(String, default="PAUSED")
    ads: Mapped[list] = mapped_column(JSON, default=list)


def _to_domain(row: CampaignRow) -> Campaign:
    return Campaign(
        id=row.id,
        client_id=row.client_id,
        meta_campaign_id=row.meta_campaign_id,
        meta_adset_id=row.meta_adset_id,
        meta_ad_id=row.meta_ad_id,
        meta_creative_id=row.meta_creative_id,
        name=row.name,
        objective=row.objective,
        budget_type=BudgetType(row.budget_type),
        budget_amount=row.budget_amount,
        status=CampaignStatus(row.status),
        ads=[Ad(**a) for a in (row.ads or [])],
    )


class PostgresCampaignRepository:
    def __init__(self, database_url: str):
        self._engine = create_async_engine(database_url, future=True)
        self._session: async_sessionmaker[AsyncSession] = async_sessionmaker(
            self._engine, expire_on_commit=False
        )

    async def create_schema(self) -> None:
        async with self._engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async def save(self, campaign: Campaign) -> Campaign:
        if campaign.id is None:
            campaign.id = str(uuid.uuid4())
        async with self._session() as session, session.begin():
            await session.merge(
                CampaignRow(
                    id=campaign.id,
                    client_id=campaign.client_id or "",
                    meta_campaign_id=campaign.meta_campaign_id,
                    meta_adset_id=campaign.meta_adset_id,
                    meta_ad_id=campaign.meta_ad_id,
                    meta_creative_id=campaign.meta_creative_id,
                    name=campaign.name,
                    objective=campaign.objective,
                    budget_type=str(campaign.budget_type),
                    budget_amount=campaign.budget_amount,
                    status=str(campaign.status),
                    ads=[_ad_to_dict(a) for a in campaign.ads],
                )
            )
        return campaign

    async def get(self, campaign_id: str) -> Campaign | None:
        async with self._session() as session:
            row = await session.get(CampaignRow, campaign_id)
            return _to_domain(row) if row else None

    async def list_by_client(self, client_id: str) -> list[Campaign]:
        async with self._session() as session:
            rows = await session.scalars(
                select(CampaignRow).where(CampaignRow.client_id == client_id)
            )
            return [_to_domain(r) for r in rows]

    async def update_status(self, campaign_id: str, status: str) -> Campaign | None:
        async with self._session() as session, session.begin():
            row = await session.get(CampaignRow, campaign_id)
            if row is None:
                return None
            row.status = status
            row.ads = [{**a, "status": status} for a in (row.ads or [])]
            return _to_domain(row)

    async def delete(self, campaign_id: str) -> None:
        async with self._session() as session, session.begin():
            row = await session.get(CampaignRow, campaign_id)
            if row is not None:
                await session.delete(row)


def _ad_to_dict(ad: Ad) -> dict:
    return {
        "id": ad.id,
        "campaign_id": ad.campaign_id,
        "meta_ad_id": ad.meta_ad_id,
        "meta_creative_id": ad.meta_creative_id,
        "headline": ad.headline,
        "body": ad.body,
        "image_url": ad.image_url,
        "cta": ad.cta,
        "status": str(ad.status),
    }
