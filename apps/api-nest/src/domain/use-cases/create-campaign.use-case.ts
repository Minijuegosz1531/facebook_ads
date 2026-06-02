import { Inject, Injectable } from '@nestjs/common';

import { CampaignBuilder } from '../models/campaign.builder';
import { BudgetType, Campaign } from '../models/campaign';
import { AD_PLATFORM, AdPlatformPort } from '../ports/ad-platform.port';
import { CAMPAIGN_REPOSITORY, CampaignRepositoryPort } from '../ports/campaign-repository.port';

/**
 * # Pattern: Command (DTO)
 *
 * A typed input object: adding a field never breaks call sites, and the
 * parameters speak for themselves at call time.
 */
export interface CreateCampaignCommand {
  clientId: string;
  adAccountId: string;
  name: string;
  objective: string;
  budgetType: BudgetType;
  budgetAmount: number; // cents
  pageId: string;
  pixelId?: string | null;
  imageUrl: string;
  headline: string;
  body: string;
  cta: string;
  linkUrl: string;
}

/**
 * # Pattern: Use case (Interactor)
 *
 * Pure orchestration over ports. Knows nothing about HTTP, Nest, the database
 * or any SDK. Testable with simple in-memory fakes.
 */
@Injectable()
export class CreateCampaignUseCase {
  constructor(
    @Inject(AD_PLATFORM) private readonly adPlatform: AdPlatformPort,
    @Inject(CAMPAIGN_REPOSITORY) private readonly repo: CampaignRepositoryPort,
  ) {}

  async execute(cmd: CreateCampaignCommand): Promise<Campaign> {
    const isCBO = cmd.budgetType === 'campaign';
    const campaignBudget = isCBO ? cmd.budgetAmount : null;
    const adsetBudget = isCBO ? null : cmd.budgetAmount;

    const campaign = await this.adPlatform.createCampaign(cmd.name, cmd.objective, campaignBudget);
    const adset = await this.adPlatform.createAdset(
      campaign.metaCampaignId ?? '',
      adsetBudget,
      cmd.pixelId ?? null,
    );
    const creative = await this.adPlatform.createCreative({
      pageId: cmd.pageId,
      imageUrl: cmd.imageUrl,
      headline: cmd.headline,
      body: cmd.body,
      cta: cmd.cta,
      linkUrl: cmd.linkUrl,
    });
    const ad = await this.adPlatform.createAd(
      adset.metaAdsetId ?? '',
      creative.metaCreativeId ?? '',
    );

    const built = new CampaignBuilder()
      .forClient(cmd.clientId)
      .named(cmd.name)
      .withObjective(cmd.objective)
      .withBudget(cmd.budgetType, cmd.budgetAmount)
      .withMetaIds(
        campaign.metaCampaignId ?? '',
        adset.metaAdsetId ?? '',
        ad.metaAdId ?? '',
        creative.metaCreativeId ?? '',
      )
      .addAd({
        metaAdId: ad.metaAdId,
        metaCreativeId: creative.metaCreativeId,
        headline: cmd.headline,
        body: cmd.body,
        imageUrl: cmd.imageUrl,
        cta: cmd.cta,
        status: 'PAUSED',
      })
      .build();

    return this.repo.save(built);
  }
}
