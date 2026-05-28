/**
 * Wire DTOs returned by the backend microservice (FastAPI or Go). The fields are
 * snake_case to match the API exactly, so the typed `ApiClient` can map straight
 * onto the HTTP responses. UI-facing view models (if any) would live alongside
 * the feature that owns them.
 */

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type BudgetType = 'campaign' | 'adset';
export type JobStatus = 'pending' | 'searching' | 'generating' | 'ready' | 'failed';

export interface Client {
  id: string;
  name: string;
  meta_ad_account_id: string;
  meta_page_id: string | null;
  meta_pixel_id: string | null;
}

export interface Ad {
  meta_ad_id: string | null;
  headline: string;
  body: string;
  image_url: string;
  cta: string;
  status: CampaignStatus;
}

export interface Campaign {
  id: string;
  client_id: string;
  meta_campaign_id: string | null;
  name: string;
  objective: string;
  budget_type: BudgetType;
  budget_amount: number; // cents
  status: CampaignStatus;
  ads: Ad[];
}

export interface Copy {
  headline: string;
  body: string;
  cta: string;
}

export interface InspirationJob {
  job_id: string;
  status: JobStatus;
  keywords: string[];
  generated_images: string[];
  generated_copies: Copy[];
  error: string | null;
}

export interface Insights {
  data: Record<string, number | string>[];
}

/** Request payloads (also snake_case to match the API). */

export interface StartInspirationRequest {
  client_id: string;
  client_name: string;
  product: string;
  description: string;
  objective: string;
  country: string;
  platforms: string[];
}

export interface PublishFromJobRequest {
  job_id: string;
  client_id: string;
  ad_account_id: string;
  name: string;
  objective: string;
  budget_type: BudgetType;
  budget_amount: number;
  page_id: string;
  pixel_id?: string | null;
  link_url: string;
  image_index: number;
  copy_index: number;
}
