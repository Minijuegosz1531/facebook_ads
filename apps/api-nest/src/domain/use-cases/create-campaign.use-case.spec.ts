import { InMemoryCampaignRepository } from '@app/adapters/outbound/stub/in-memory-campaign-repository';
import { StubAdPlatform } from '@app/adapters/outbound/stub/stub-ad-platform';
import { CreateCampaignCommand, CreateCampaignUseCase } from './create-campaign.use-case';

/**
 * Pure unit test: instantiate the use case with stub adapters directly. No
 * Nest test module needed because the use case is just a class that takes its
 * dependencies through the constructor.
 */
describe('CreateCampaignUseCase', () => {
  const baseCommand = (): CreateCampaignCommand => ({
    clientId: 'client-1',
    adAccountId: 'act_1001',
    name: 'Lanzamiento Verano',
    objective: 'OUTCOME_SALES',
    budgetType: 'campaign',
    budgetAmount: 5000,
    pageId: 'page_1',
    pixelId: null,
    imageUrl: 'https://img/1.jpg',
    headline: 'Compra ya',
    body: 'La mejor oferta',
    cta: 'SHOP_NOW',
    linkUrl: 'https://shop.example/p',
  });

  it('persists a PAUSED campaign with all Meta IDs', async () => {
    const repo = new InMemoryCampaignRepository();
    const uc = new CreateCampaignUseCase(new StubAdPlatform(), repo);

    const c = await uc.execute(baseCommand());

    expect(c.id).toBeTruthy();
    expect(c.status).toBe('PAUSED');
    expect(c.metaCampaignId).toMatch(/^metacamp_/);
    expect(c.metaAdsetId).toBeTruthy();
    expect(c.metaAdId).toBeTruthy();
    expect(c.metaCreativeId).toBeTruthy();
    expect(c.ads).toHaveLength(1);
    expect(await repo.get(c.id!)).toBe(c);
  });

  it('places the budget on the campaign for CBO', async () => {
    const repo = new InMemoryCampaignRepository();
    const uc = new CreateCampaignUseCase(new StubAdPlatform(), repo);
    const c = await uc.execute({ ...baseCommand(), budgetType: 'campaign', budgetAmount: 7000 });
    expect(c.budgetAmount).toBe(7000);
    expect(c.budgetType).toBe('campaign');
  });
});
