"""Use cases are testable in isolation with stub ports — the point of hexagonal."""
from adapters.outbound.stubs import InMemoryCampaignRepository, StubAdPlatform
from domain.models.campaign import CampaignStatus
from domain.use_cases.create_campaign import CreateCampaignCommand, CreateCampaignUseCase


def _command(**overrides):
    base = dict(
        client_id="client-1",
        ad_account_id="act_1001",
        name="Lanzamiento Verano",
        objective="OUTCOME_SALES",
        budget_type="campaign",
        budget_amount=5000,
        page_id="page_1",
        image_url="https://img/1.jpg",
        headline="Compra ya",
        body="La mejor oferta",
        cta="SHOP_NOW",
        link_url="https://shop.example/p",
    )
    base.update(overrides)
    return CreateCampaignCommand(**base)


async def test_create_campaign_persists_paused_campaign_with_meta_ids():
    repo = InMemoryCampaignRepository()
    use_case = CreateCampaignUseCase(StubAdPlatform(), repo)

    campaign = await use_case.execute(_command())

    assert campaign.id is not None
    assert campaign.status is CampaignStatus.PAUSED
    assert campaign.meta_campaign_id and campaign.meta_campaign_id.startswith("camp_")
    assert campaign.meta_adset_id and campaign.meta_ad_id and campaign.meta_creative_id
    assert len(campaign.ads) == 1
    assert (await repo.get(campaign.id)) is campaign


async def test_cbo_budget_goes_to_campaign_not_adset():
    repo = InMemoryCampaignRepository()
    use_case = CreateCampaignUseCase(StubAdPlatform(), repo)

    campaign = await use_case.execute(_command(budget_type="campaign", budget_amount=7000))

    assert campaign.budget_amount == 7000
