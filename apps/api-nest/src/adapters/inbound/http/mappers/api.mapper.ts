/* eslint-disable @typescript-eslint/naming-convention */
import { Campaign } from '@app/domain/models/campaign';
import { Client } from '@app/domain/models/client';
import { InspirationJob } from '@app/domain/models/inspiration';

export const toCampaignResponse = (c: Campaign) => ({
  id: c.id ?? null,
  client_id: c.clientId ?? null,
  meta_campaign_id: c.metaCampaignId ?? null,
  name: c.name,
  objective: c.objective,
  budget_type: c.budgetType,
  budget_amount: c.budgetAmount,
  status: c.status,
  ads: c.ads.map((a) => ({
    meta_ad_id: a.metaAdId ?? null,
    headline: a.headline,
    body: a.body,
    image_url: a.imageUrl,
    cta: a.cta,
    status: a.status,
  })),
});

export const toJobResponse = (j: InspirationJob) => ({
  job_id: j.id,
  status: j.status,
  keywords: j.keywords,
  generated_images: j.assets.images.map((i) => i.url),
  generated_copies: j.assets.copies.map((c) => ({ headline: c.headline, body: c.body, cta: c.cta })),
  error: j.error ?? null,
});

export const toClientResponse = (c: Client) => ({
  id: c.id,
  name: c.name,
  meta_ad_account_id: c.metaAdAccountId,
  meta_page_id: c.metaPageId,
  meta_pixel_id: c.metaPixelId,
});
