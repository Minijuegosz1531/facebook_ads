import { Inject, Injectable } from '@nestjs/common';

import { Campaign, CampaignStatus } from '../models/campaign';
import { NotFoundError } from '../errors/domain.errors';
import { AD_PLATFORM, AdPlatformPort } from '../ports/ad-platform.port';
import { CAMPAIGN_REPOSITORY, CampaignRepositoryPort } from '../ports/campaign-repository.port';

@Injectable()
export class UpdateCampaignStatusUseCase {
  constructor(
    @Inject(AD_PLATFORM) private readonly adPlatform: AdPlatformPort,
    @Inject(CAMPAIGN_REPOSITORY) private readonly repo: CampaignRepositoryPort,
  ) {}

  async execute(campaignId: string, status: CampaignStatus): Promise<Campaign> {
    const existing = await this.repo.get(campaignId);
    if (!existing) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }
    if (existing.metaCampaignId) {
      await this.adPlatform.updateStatus('campaign', existing.metaCampaignId, status);
    }
    const updated = await this.repo.updateStatus(campaignId, status);
    if (!updated) {
      throw new NotFoundError(`Campaign ${campaignId} not found`);
    }
    return updated;
  }
}
