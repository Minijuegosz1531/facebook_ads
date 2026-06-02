export type JobStatus = 'pending' | 'searching' | 'generating' | 'ready' | 'failed';

export interface ReferenceAd {
  body: string;
  title: string;
  snapshotUrl: string;
  impressions: number;
}

export interface GeneratedImage {
  url: string;
  requestId: string;
}

export interface Copy {
  headline: string;
  body: string;
  cta: string;
}

export interface GeneratedAssets {
  images: GeneratedImage[];
  copies: Copy[];
}

export interface InspirationJob {
  id: string;
  clientId: string;
  keywords: string[];
  country: string;
  platforms: string[];
  status: JobStatus;
  referenceAds: ReferenceAd[];
  assets: GeneratedAssets;
  higgsfieldRequestIds: string[];
  error?: string | null;
  createdAt: Date;
}
