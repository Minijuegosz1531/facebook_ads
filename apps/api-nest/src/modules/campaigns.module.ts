import { Module } from '@nestjs/common';

import { ApplicationModule } from '@app/application/application.module';
import { CampaignsController } from '@app/adapters/inbound/http/controllers/campaigns.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [CampaignsController],
})
export class CampaignsHttpModule {}
