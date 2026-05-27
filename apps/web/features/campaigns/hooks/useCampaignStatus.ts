"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStatus } from "../actions/updateStatus";
import type { Campaign, CampaignStatus } from "../types";

// Toggle active/pause/archive with an optimistic update on the detail query.
export function useCampaignStatus(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: CampaignStatus) => updateStatus({ id, status }),
    onMutate: async (status) => {
      await qc.cancelQueries({ queryKey: ["campaign", id] });
      const previous = qc.getQueryData<Campaign>(["campaign", id]);
      if (previous) {
        qc.setQueryData<Campaign>(["campaign", id], { ...previous, status });
      }
      return { previous };
    },
    onError: (_err, _status, ctx) => {
      if (ctx?.previous) qc.setQueryData(["campaign", id], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["campaign", id] });
      qc.invalidateQueries({ queryKey: ["campaigns"] });
    },
  });
}
