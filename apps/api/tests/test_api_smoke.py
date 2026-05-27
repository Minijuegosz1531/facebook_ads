"""End-to-end smoke test of the HTTP API in stub mode (no external services)."""
import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_clients_are_seeded(client):
    resp = await client.get("/clients")
    assert resp.status_code == 200
    clients = resp.json()
    assert len(clients) >= 1
    assert "meta_ad_account_id" in clients[0]


async def test_full_flow_inspiration_to_published_campaign(client):
    clients = (await client.get("/clients")).json()
    c = clients[0]

    # 1. start inspiration
    start = await client.post(
        "/inspiration/search",
        json={
            "client_id": c["id"],
            "client_name": c["name"],
            "product": "café de especialidad",
            "description": "Promocionar café de especialidad colombiano premium tostado",
            "objective": "OUTCOME_SALES",
            "country": "CO",
        },
    )
    assert start.status_code == 202
    job_id = start.json()["job_id"]

    # 2. poll until ready (background task runs in stub mode)
    job = None
    for _ in range(20):
        job = (await client.get(f"/inspiration/{job_id}")).json()
        if job["status"] == "ready":
            break
    assert job is not None and job["status"] == "ready"
    assert len(job["generated_images"]) == 5
    assert len(job["generated_copies"]) == 10

    # 3. publish a campaign from the selected image + copy
    publish = await client.post(
        "/campaigns/publish-from-job",
        json={
            "job_id": job_id,
            "client_id": c["id"],
            "ad_account_id": c["meta_ad_account_id"],
            "name": "Campaña Café Premium",
            "objective": "OUTCOME_SALES",
            "budget_type": "campaign",
            "budget_amount": 5000,
            "page_id": c["meta_page_id"],
            "link_url": "https://shop.example/cafe",
            "image_index": 0,
            "copy_index": 0,
        },
    )
    assert publish.status_code == 201
    campaign = publish.json()
    assert campaign["status"] == "PAUSED"
    campaign_id = campaign["id"]

    # 4. activate it
    activated = await client.patch(
        f"/campaigns/{campaign_id}/status", json={"status": "ACTIVE"}
    )
    assert activated.status_code == 200
    assert activated.json()["status"] == "ACTIVE"

    # 5. insights
    insights = await client.get(f"/campaigns/{campaign_id}/insights")
    assert insights.status_code == 200
    assert "data" in insights.json()

    # 6. it shows up in the client's campaign list
    listed = await client.get("/campaigns", params={"client_id": c["id"]})
    assert any(item["id"] == campaign_id for item in listed.json())
