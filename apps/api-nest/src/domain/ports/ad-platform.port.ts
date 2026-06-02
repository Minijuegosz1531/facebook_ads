import { Ad, Adset, Campaign, Creative, CampaignStatus } from '../models/campaign';

/**
 * Outbound port for the advertising platform (the Meta Ads CLI in production,
 * a stub in dev/tests). Use cases depend on this interface; adapters implement it.
 *
 * # NestJS detail: injecting interfaces
 *
 * TypeScript interfaces disappear at runtime, so Nest cannot use them as DI
 * keys. We pair every port with a `Symbol` token used in `@Inject(...)`.
 */
export const AD_PLATFORM = Symbol('AdPlatformPort');

export interface AdPlatformPort {
  createCampaign(name: string, objective: string, budget: number | null): Promise<Campaign>;
  createAdset(campaignId: string, budget: number | null, pixelId: string | null): Promise<Adset>;
  createCreative(creative: Creative): Promise<Creative>;
  createAd(adsetId: string, creativeId: string): Promise<Ad>;
  updateStatus(objectType: string, objectId: string, status: CampaignStatus): Promise<void>;
  getInsights(
    campaignId: string,
    fields: string[],
    since: string,
    until: string,
  ): Promise<Record<string, unknown>>;
}
