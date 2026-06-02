import { Body, Controller, Param, Post } from '@nestjs/common';

import { InspirationService } from '@app/application/inspiration.service';
import { HiggsfieldCallbackDto } from '../dto/higgsfield-callback.dto';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly inspiration: InspirationService) {}

  @Post('higgsfield/:jobId')
  async higgsfield(@Param('jobId') jobId: string, @Body() dto: HiggsfieldCallbackDto) {
    await this.inspiration.attachImage(jobId, dto.request_id, dto.image_url);
    return { ok: true };
  }
}
