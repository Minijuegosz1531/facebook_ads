import { Injectable } from '@nestjs/common';

import { Ad, Adset, Campaign, CampaignStatus, Creative } from '@app/domain/models/campaign';
import { AdPlatformPort } from '@app/domain/ports/ad-platform.port';
import { nextId } from './ids';

/** Fake AdPlatformPort — returns deterministic Meta IDs without shelling out. */
@Injectable()
export class StubAdPlatform implements AdPlatformPort {
  async createCampaign(name: string, objective: string, _budget: number | null): Promise<Campaign> {
    return {
      clientId: '',
      name,
      objective,
      budgetType: 'campaign',
      budgetAmount: 0,
      status: 'PAUSED',
      metaCampaignId: nextId('metacamp'),
      ads: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async createAdset(
    campaignId: string,
    budget: number | null,
    pixelId: string | null,
  ): Promise<Adset> {
    return { campaignId, metaAdsetId: nextId('metaadset'), budget, pixelId };
  }

  async createCreative(c: Creative): Promise<Creative> {
    return { ...c, metaCreativeId: nextId('metacreative') };
  }

  async createAd(_adsetId: string, creativeId: string): Promise<Ad> {
    return {
      metaAdId: nextId('metaad'),
      metaCreativeId: creativeId,
      headline: '',
      body: '',
      imageUrl: '',
      cta: '',
      status: 'PAUSED',
    };
  }

  async updateStatus(_t: string, _id: string, _status: CampaignStatus): Promise<void> {
    return;
  }

  async getInsights(
    _id: string,
    _fields: string[],
    since: string,
    until: string,
  ): Promise<Record<string, unknown>> {
    return {
      data: [
        {
          impressions: 12450,
          clicks: 312,
          spend: 84.2,
          ctr: 2.51,
          cpc: 0.27,
          reach: 9810,
          date_start: since,
          date_stop: until,
        },
      ],
    };
  }
}
