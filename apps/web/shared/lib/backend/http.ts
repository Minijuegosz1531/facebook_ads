// Proxy backend: forwards to the FastAPI microservice (API_BASE_URL).
// Used when MOCK_API is not set.

import type { Campaign, Client, InspirationJob, Insights } from "@/shared/types/api";
import type { Backend, PublishFromJobPayload, StartInspirationPayload } from "./types";

const BASE = process.env.API_BASE_URL ?? "http://localhost:8000";

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Backend ${res.status}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const httpBackend: Backend = {
  listClients: () => call<Client[]>("/clients"),
  getClient: (id) => call<Client | null>(`/clients/${id}`),
  listCampaigns: (clientId) =>
    call<Campaign[]>(`/campaigns?client_id=${encodeURIComponent(clientId)}`),
  getCampaign: (id) => call<Campaign | null>(`/campaigns/${id}`),
  publishFromJob: (payload: PublishFromJobPayload) =>
    call<Campaign>("/campaigns/publish-from-job", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateStatus: (id, status) =>
    call<Campaign>(`/campaigns/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  deleteCampaign: (id) => call<void>(`/campaigns/${id}`, { method: "DELETE" }),
  getInsights: (id) => call<Insights>(`/campaigns/${id}/insights`),
  startInspiration: (payload: StartInspirationPayload) =>
    call<InspirationJob>("/inspiration/search", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getJob: (jobId) => call<InspirationJob | null>(`/inspiration/${jobId}`),
};
