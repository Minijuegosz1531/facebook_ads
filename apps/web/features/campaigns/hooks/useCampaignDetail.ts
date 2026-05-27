"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { Campaign } from "../types";

export function useCampaignDetail(id: string) {
  return useQuery({
    queryKey: ["campaign", id],
    queryFn: () => apiClient.get<Campaign>(`/campaigns/${id}`),
  });
}
