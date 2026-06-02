import { Inject, Injectable } from '@nestjs/common';

import { Campaign, CampaignStatus } from '../domain/models/campaign';
import { CAMPAIGN_REPOSITORY, CampaignRepositoryPort } from '../domain/ports/campaign-repository.port';
import {
  CreateCampaignCommand,
  CreateCampaignUseCase,
} from '../domain/use-cases/create-campaign.use-case';
import { GetInsightsUseCase } from '../domain/use-cases/get-insights.use-case';
import {
  SelectAndPublishCommand,
  SelectAndPublishUseCase,
} from '../domain/use-cases/select-and-publish.use-case';
import { UpdateCampaignStatusUseCase } from '../domain/use-cases/update-campaign-status.use-case';

/**
 * # Pattern: Facade
 *
 * Groups campaign-related use cases behind one service consumed by the HTTP
 * controllers. Nest's DI assembles the use cases; this class only forwards.
 */
@Injectable()
export class CampaignsService {
  constructor(
    @Inject(CAMPAIGN_REPOSITORY) private readonly repo: CampaignRepositoryPort,
    private readonly create: CreateCampaignUseCase,
    private readonly statusUC: UpdateCampaignStatusUseCase,
    private readonly insightsUC: GetInsightsUseCase,
    private readonly publish: SelectAndPublishUseCase,
  ) {}

  createCampaign(cmd: CreateCampaignCommand): Promise<Campaign> {
    return this.create.execute(cmd);
  }

  publishFromJob(cmd: SelectAndPublishCommand): Promise<Campaign> {
    return this.publish.execute(cmd);
  }

  updateStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    return this.statusUC.execute(id, status);
  }

  get(id: string): Promise<Campaign | null> {
    return this.repo.get(id);
  }

  listByClient(clientId: string): Promise<Campaign[]> {
    return this.repo.listByClient(clientId);
  }

  insights(id: string, since: string, until: string): Promise<Record<string, unknown>> {
    return this.insightsUC.execute(id, since, until);
  }

  delete(id: string): Promise<void> {
    return this.repo.delete(id);
  }
}
