import { Module } from '@nestjs/common';

import { AttachImageUseCase } from '@app/domain/use-cases/attach-image.use-case';
import { CreateCampaignUseCase } from '@app/domain/use-cases/create-campaign.use-case';
import { GenerateInspirationUseCase } from '@app/domain/use-cases/generate-inspiration.use-case';
import { GetInsightsUseCase } from '@app/domain/use-cases/get-insights.use-case';
import { SelectAndPublishUseCase } from '@app/domain/use-cases/select-and-publish.use-case';
import { UpdateCampaignStatusUseCase } from '@app/domain/use-cases/update-campaign-status.use-case';

import { CampaignsService } from './campaigns.service';
import { InspirationService } from './inspiration.service';

/**
 * Provides every use case and the two application services. The HTTP feature
 * modules import this module and consume the services as the only public seam.
 */
@Module({
  providers: [
    CreateCampaignUseCase,
    UpdateCampaignStatusUseCase,
    GenerateInspirationUseCase,
    SelectAndPublishUseCase,
    GetInsightsUseCase,
    AttachImageUseCase,
    CampaignsService,
    InspirationService,
  ],
  exports: [CampaignsService, InspirationService],
})
export class ApplicationModule {}
