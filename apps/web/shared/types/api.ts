// Base DTO shapes returned by the FastAPI microservice. Features may extend
// these but the wire shapes live here so the API-proxy layer and features agree.

export type CampaignStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

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
  budget_type: "campaign" | "adset";
  budget_amount: number;
  status: CampaignStatus;
  ads: Ad[];
}

export type JobStatus = "pending" | "searching" | "generating" | "ready" | "failed";

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
