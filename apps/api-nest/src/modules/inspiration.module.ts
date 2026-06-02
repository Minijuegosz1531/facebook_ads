import { Module } from '@nestjs/common';

import { ApplicationModule } from '@app/application/application.module';
import { InspirationController } from '@app/adapters/inbound/http/controllers/inspiration.controller';

@Module({
  imports: [ApplicationModule],
  controllers: [InspirationController],
})
export class InspirationHttpModule {}
