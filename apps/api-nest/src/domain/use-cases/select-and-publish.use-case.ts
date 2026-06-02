import { Inject, Injectable } from '@nestjs/common';

import { BudgetType, Campaign } from '../models/campaign';
import { InvalidStateError, NotFoundError, ValidationError } from '../errors/domain.errors';
import { JOB_STORE, JobStorePort } from '../ports/job-store.port';
import { CreateCampaignUseCase } from './create-campaign.use-case';

export interface SelectAndPublishCommand {
  jobId: string;
  clientId: string;
  adAccountId: string;
  name: string;
  objective: string;
  budgetType: BudgetType;
  budgetAmount: number;
  pageId: string;
  pixelId?: string | null;
  linkUrl: string;
  imageIndex: number;
  copyIndex: number;
}

/**
 * Composes CreateCampaignUseCase: given a ready job + a selection, publishes
 * the chosen image+copy as a full campaign. Reuses the existing use case
 * instead of duplicating the create logic.
 */
@Injectable()
export class SelectAndPublishUseCase {
  constructor(
    @Inject(JOB_STORE) private readonly jobStore: JobStorePort,
    private readonly createCampaign: CreateCampaignUseCase,
  ) {}

  async execute(cmd: SelectAndPublishCommand): Promise<Campaign> {
    const job = await this.jobStore.get(cmd.jobId);
    if (!job) {
      throw new NotFoundError(`Job ${cmd.jobId} not found`);
    }
    if (job.status !== 'ready') {
      throw new InvalidStateError(`Job ${cmd.jobId} is ${job.status}, not ready`);
    }
    if (cmd.imageIndex < 0 || cmd.imageIndex >= job.assets.images.length) {
      throw new ValidationError('image_index out of range');
    }
    if (cmd.copyIndex < 0 || cmd.copyIndex >= job.assets.copies.length) {
      throw new ValidationError('copy_index out of range');
    }
    const image = job.assets.images[cmd.imageIndex];
    const copy = job.assets.copies[cmd.copyIndex];

    return this.createCampaign.execute({
      clientId: cmd.clientId,
      adAccountId: cmd.adAccountId,
      name: cmd.name,
      objective: cmd.objective,
      budgetType: cmd.budgetType,
      budgetAmount: cmd.budgetAmount,
      pageId: cmd.pageId,
      pixelId: cmd.pixelId ?? null,
      imageUrl: image.url,
      headline: copy.headline,
      body: copy.body,
      cta: copy.cta,
      linkUrl: cmd.linkUrl,
    });
  }
}
