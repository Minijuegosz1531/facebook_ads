import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CampaignsService } from '@app/application/campaigns.service';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { PublishFromJobDto } from '../dto/publish-from-job.dto';
import { UpdateStatusDto } from '../dto/update-status.dto';
import { toCampaignResponse } from '../mappers/api.mapper';

@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get()
  async list(@Query('client_id') clientId: string) {
    if (!clientId) return { detail: 'client_id is required' };
    return (await this.campaigns.listByClient(clientId)).map(toCampaignResponse);
  }

  @Post()
  @HttpCode(201)
  async create(@Body() dto: CreateCampaignDto) {
    const c = await this.campaigns.createCampaign({
      clientId: dto.client_id,
      adAccountId: dto.ad_account_id,
      name: dto.name,
      objective: dto.objective,
      budgetType: dto.budget_type,
      budgetAmount: dto.budget_amount,
      pageId: dto.page_id,
      pixelId: dto.pixel_id ?? null,
      imageUrl: dto.image_url,
      headline: dto.headline,
      body: dto.body,
      cta: dto.cta,
      linkUrl: dto.link_url,
    });
    return toCampaignResponse(c);
  }

  @Post('publish-from-job')
  @HttpCode(201)
  async publishFromJob(@Body() dto: PublishFromJobDto) {
    const c = await this.campaigns.publishFromJob({
      jobId: dto.job_id,
      clientId: dto.client_id,
      adAccountId: dto.ad_account_id,
      name: dto.name,
      objective: dto.objective,
      budgetType: dto.budget_type,
      budgetAmount: dto.budget_amount,
      pageId: dto.page_id,
      pixelId: dto.pixel_id ?? null,
      linkUrl: dto.link_url,
      imageIndex: dto.image_index,
      copyIndex: dto.copy_index,
    });
    return toCampaignResponse(c);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const c = await this.campaigns.get(id);
    if (!c) throw new NotFoundException('Campaign not found');
    return toCampaignResponse(c);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return toCampaignResponse(await this.campaigns.updateStatus(id, dto.status));
  }

  @Get(':id/insights')
  insights(
    @Param('id') id: string,
    @Query('since', new DefaultValuePipe('2026-01-01')) since: string,
    @Query('until', new DefaultValuePipe('2026-12-31')) until: string,
  ) {
    return this.campaigns.insights(id, since, until);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Param('id') id: string): Promise<void> {
    await this.campaigns.delete(id);
  }
}
