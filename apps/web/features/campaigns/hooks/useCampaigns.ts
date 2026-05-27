"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { Campaign } from "../types";

export function useCampaigns(clientId: string | null) {
  return useQuery({
    queryKey: ["campaigns", clientId],
    enabled: !!clientId,
    queryFn: () =>
      apiClient.get<Campaign[]>(`/campaigns?client_id=${encodeURIComponent(clientId!)}`),
  });
}
