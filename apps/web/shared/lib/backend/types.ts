import type {
  Campaign,
  Client,
  InspirationJob,
  Insights,
} from "@/shared/types/api";

export interface StartInspirationPayload {
  client_id: string;
  client_name: string;
  product: string;
  description: string;
  objective: string;
  country: string;
  platforms?: string[];
}

export interface PublishFromJobPayload {
  job_id: string;
  client_id: string;
  ad_account_id: string;
  name: string;
  objective: string;
  budget_type: "campaign" | "adset";
  budget_amount: number;
  page_id: string;
  pixel_id?: string | null;
  link_url: string;
  image_index: number;
  copy_index: number;
}

export interface Backend {
  listClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | null>;
  listCampaigns(clientId: string): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | null>;
  publishFromJob(payload: PublishFromJobPayload): Promise<Campaign>;
  updateStatus(id: string, status: string): Promise<Campaign>;
  deleteCampaign(id: string): Promise<void>;
  getInsights(id: string): Promise<Insights>;
  startInspiration(payload: StartInspirationPayload): Promise<InspirationJob>;
  getJob(jobId: string): Promise<InspirationJob | null>;
}
