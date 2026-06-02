import { Body, Controller, Get, HttpCode, NotFoundException, Param, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InspirationService } from '@app/application/inspiration.service';
import { StartInspirationDto } from '../dto/start-inspiration.dto';
import { toJobResponse } from '../mappers/api.mapper';

@Controller('inspiration')
export class InspirationController {
  constructor(
    private readonly inspiration: InspirationService,
    private readonly cfg: ConfigService,
  ) {}

  @Post('search')
  @HttpCode(202)
  async start(@Body() dto: StartInspirationDto) {
    const jobId = InspirationService.newJobId();
    const job = await this.inspiration.startAndRun({
      jobId,
      clientId: dto.client_id,
      clientName: dto.client_name,
      product: dto.product,
      description: dto.description,
      objective: dto.objective,
      country: dto.country,
      webhookBaseUrl: this.cfg.get<string>('BASE_URL') ?? 'http://localhost:8080',
      platforms: dto.platforms ?? ['facebook', 'instagram'],
      imageCount: dto.image_count ?? 5,
      copyCount: dto.copy_count ?? 10,
    });
    return toJobResponse(job);
  }

  @Get(':jobId')
  async getJob(@Param('jobId') jobId: string) {
    const job = await this.inspiration.get(jobId);
    if (!job) throw new NotFoundException('Job not found');
    return toJobResponse(job);
  }
}
