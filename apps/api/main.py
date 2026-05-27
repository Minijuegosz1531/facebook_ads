"""FastAPI application entrypoint: wires routers and the DI container."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from adapters.inbound.http.routers import campaigns, clients, inspiration, webhooks
from infrastructure.database import init_schema


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_schema()
    yield


def create_app() -> FastAPI:
    app = FastAPI(title="Meta Ads Platform API", version="0.1.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
    app.include_router(inspiration.router, prefix="/inspiration", tags=["inspiration"])
    app.include_router(clients.router, prefix="/clients", tags=["clients"])
    app.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

    @app.get("/health", tags=["health"])
    async def health() -> dict:
        return {"status": "ok"}

    return app


app = create_app()
