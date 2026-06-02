/**
 * Pure domain entities for the advertising side. No NestJS imports here —
 * the domain is framework-agnostic; only the outer layers know about Nest.
 */

export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type BudgetType = 'campaign' | 'adset';

export interface Creative {
  pageId: string;
  imageUrl: string;
  headline: string;
  body: string;
  cta: string;
  linkUrl: string;
  metaCreativeId?: string;
}

export interface Adset {
  campaignId: string;
  metaAdsetId?: string;
  budget?: number | null;
  pixelId?: string | null;
}

export interface Ad {
  metaAdId?: string;
  metaCreativeId?: string;
  headline: string;
  body: string;
  imageUrl: string;
  cta: string;
  status: CampaignStatus;
}

export interface Campaign {
  id?: string;
  clientId: string;
  metaCampaignId?: string;
  metaAdsetId?: string;
  metaAdId?: string;
  metaCreativeId?: string;
  name: string;
  objective: string;
  budgetType: BudgetType;
  budgetAmount: number; // cents
  status: CampaignStatus;
  ads: Ad[];
  createdAt: Date;
  updatedAt: Date;
}
