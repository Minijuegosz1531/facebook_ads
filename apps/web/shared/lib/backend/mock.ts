// In-memory backend used when MOCK_API=1 (local dev + Playwright E2E).
// Module-level state persists for the life of the dev server process.

import type {
  Campaign,
  Client,
  InspirationJob,
  Insights,
} from "@/shared/types/api";
import type {
  Backend,
  PublishFromJobPayload,
  StartInspirationPayload,
} from "./types";

const clients: Client[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Cafetería Andina",
    meta_ad_account_id: "act_1001",
    meta_page_id: "page_1001",
    meta_pixel_id: "pixel_1001",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Moda Tropical",
    meta_ad_account_id: "act_1002",
    meta_page_id: "page_1002",
    meta_pixel_id: "pixel_1002",
  },
];

const campaigns = new Map<string, Campaign>();
const jobs = new Map<string, InspirationJob>();

let seq = 0;
const id = (p: string) => `${p}_${(++seq).toString().padStart(6, "0")}`;

export const mockBackend: Backend = {
  async listClients() {
    return clients;
  },

  async getClient(clientId) {
    return clients.find((c) => c.id === clientId) ?? null;
  },

  async listCampaigns(clientId) {
    return [...campaigns.values()].filter((c) => c.client_id === clientId);
  },

  async getCampaign(campaignId) {
    return campaigns.get(campaignId) ?? null;
  },

  async startInspiration(payload: StartInspirationPayload) {
    const jobId = id("job");
    const keywords = payload.description
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 5)
      .map((w) => w.toLowerCase());
    const job: InspirationJob = {
      job_id: jobId,
      status: "ready", // deterministic: ready immediately for E2E
      keywords: keywords.length ? keywords : ["producto", "oferta"],
      generated_images: Array.from(
        { length: 5 },
        (_, i) =>
          `https://picsum.photos/seed/${payload.product.replace(/\s+/g, "-")}-${i}/600/600`,
      ),
      generated_copies: Array.from({ length: 10 }, (_, i) => ({
        headline: `${payload.product} — opción ${i + 1}`,
        body: `${payload.client_name}: lo que buscabas en ${payload.product}.`,
        cta: ["SHOP_NOW", "LEARN_MORE", "SIGN_UP"][i % 3],
      })),
      error: null,
    };
    jobs.set(jobId, job);
    return job;
  },

  async getJob(jobId) {
    return jobs.get(jobId) ?? null;
  },

  async publishFromJob(payload: PublishFromJobPayload) {
    const job = jobs.get(payload.job_id);
    if (!job) throw new Error("job not found");
    const image = job.generated_images[payload.image_index];
    const copy = job.generated_copies[payload.copy_index];
    const campaignId = id("camp");
    const campaign: Campaign = {
      id: campaignId,
      client_id: payload.client_id,
      meta_campaign_id: id("meta-camp"),
      name: payload.name,
      objective: payload.objective,
      budget_type: payload.budget_type,
      budget_amount: payload.budget_amount,
      status: "PAUSED",
      ads: [
        {
          meta_ad_id: id("meta-ad"),
          headline: copy.headline,
          body: copy.body,
          image_url: image,
          cta: copy.cta,
          status: "PAUSED",
        },
      ],
    };
    campaigns.set(campaignId, campaign);
    return campaign;
  },

  async updateStatus(campaignId, status) {
    const campaign = campaigns.get(campaignId);
    if (!campaign) throw new Error("campaign not found");
    campaign.status = status as Campaign["status"];
    campaign.ads = campaign.ads.map((a) => ({ ...a, status: campaign.status }));
    return campaign;
  },

  async deleteCampaign(campaignId) {
    campaigns.delete(campaignId);
  },

  async getInsights(): Promise<Insights> {
    return {
      data: [
        {
          impressions: 12450,
          clicks: 312,
          spend: 84.2,
          ctr: 2.51,
          cpc: 0.27,
          reach: 9810,
        },
      ],
    };
  },
};
