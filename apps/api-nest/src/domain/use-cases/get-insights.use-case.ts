import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../errors/domain.errors';
import { AD_PLATFORM, AdPlatformPort } from '../ports/ad-platform.port';
import { CAMPAIGN_REPOSITORY, CampaignRepositoryPort } from '../ports/campaign-repository.port';

const DEFAULT_FIELDS = ['impressions', 'clicks', 'spend', 'ctr', 'cpc', 'reach'];

@Injectable()
export class GetInsightsUseCase {
  constructor(
    @Inject(AD_PLATFORM) private readonly adPlatform: AdPlatformPort,
    @Inject(CAMPAIGN_REPOSITORY) private readonly repo: CampaignRepositoryPort,
  ) {}

  async execute(campaignId: string, since: string, until: string): Promise<Record<string, unknown>> {
    const campaign = await this.repo.get(campaignId);
    if (!campaign) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }
    if (!campaign.metaCampaignId) {
      return { data: [] };
    }
    return this.adPlatform.getInsights(campaign.metaCampaignId, DEFAULT_FIELDS, since, until);
  }
}
