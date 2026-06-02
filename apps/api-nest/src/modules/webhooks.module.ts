import { Module } from '@nestjs/common';

import { ApplicationModule } from '@app/application/application.module';
import { WebhooksController } from '@app/adapters/inbound/http/controllers/webhooks.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [WebhooksController],
})
export class WebhooksHttpModule {}
