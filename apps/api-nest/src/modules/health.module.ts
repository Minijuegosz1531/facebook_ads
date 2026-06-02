import { Module } from '@nestjs/common';

import { HealthController } from '@app/adapters/inbound/http/controllers/health.controller';

@Module({
  controllers: [HealthController],
})
export class HealthModule {}
