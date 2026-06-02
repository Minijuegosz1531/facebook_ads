import { ValidationError } from '../errors/domain.errors';
import { Ad, BudgetType, Campaign } from './campaign';

/**
 * # Pattern: Builder
 *
 * Assembles a Campaign aggregate step by step from data that arrives over
 * several remote calls (campaign + adset + creative + ad). Validation is
 * deferred to `build()` so a partially-constructed object is never visible.
 *
 *   const camp = new CampaignBuilder()
 *     .forClient('c1')
 *     .named('Summer Launch')
 *     .withObjective('OUTCOME_SALES')
 *     .withBudget('campaign', 5000)
 *     .withMetaIds(campId, adsetId, adId, creativeId)
 *     .addAd(ad)
 *     .build();
 */
export class CampaignBuilder {
  private c: Partial<Campaign> = {
    status: 'PAUSED', // every Meta object is born PAUSED
    budgetType: 'campaign',
    ads: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  forClient(clientId: string): this {
    this.c.clientId = clientId;
    return this;
  }
  named(name: string): this {
    this.c.name = name;
    return this;
  }
  withObjective(objective: string): this {
    this.c.objective = objective;
    return this;
  }
  withBudget(type: BudgetType, amount: number): this {
    this.c.budgetType = type;
    this.c.budgetAmount = amount;
    return this;
  }
  withMetaIds(campaignId: string, adsetId: string, adId: string, creativeId: string): this {
    this.c.metaCampaignId = campaignId;
    this.c.metaAdsetId = adsetId;
    this.c.metaAdId = adId;
    this.c.metaCreativeId = creativeId;
    return this;
  }
  addAd(ad: Ad): this {
    (this.c.ads ??= []).push(ad);
    return this;
  }

  build(): Campaign {
    const missing: string[] = [];
    if (!this.c.clientId) missing.push('clientId');
    if (!this.c.name) missing.push('name');
    if (!this.c.objective) missing.push('objective');
    if (missing.length > 0) {
      throw new ValidationError(`Campaign missing required fields: ${missing.join(', ')}`);
    }
    return this.c as Campaign;
  }
}
