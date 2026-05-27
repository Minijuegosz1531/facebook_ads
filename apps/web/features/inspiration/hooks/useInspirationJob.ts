"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/shared/lib/api-client";
import type { InspirationJob } from "../types";

// Polls the job every 2s until it reaches a terminal state (ready | failed).
export function useInspirationJob(jobId: string | null) {
  const query = useQuery({
    queryKey: ["inspiration", jobId],
    enabled: jobId !== null,
    queryFn: () => apiClient.get<InspirationJob>(`/inspiration/${jobId}`),
    refetchInterval: (q) => {
      const status = q.state.data?.status;
      return status === "ready" || status === "failed" ? false : 2000;
    },
  });

  return {
    job: query.data,
    isLoading: query.isLoading,
    isReady: query.data?.status === "ready",
    isFailed: query.data?.status === "failed",
    images: query.data?.generated_images ?? [],
    copies: query.data?.generated_copies ?? [],
  };
}
