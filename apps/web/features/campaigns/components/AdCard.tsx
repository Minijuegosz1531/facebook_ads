"use client";

import { StatusBadge } from "@/shared/components/StatusBadge";
import { AdPreview } from "./AdPreview";
import type { Ad } from "../types";

export function AdCard({ ad }: { ad: Ad }) {
  return (
    <div className="rounded-lg border border-gray-200 p-4" data-testid="ad-card">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-gray-500">{ad.meta_ad_id ?? "—"}</span>
        <StatusBadge status={ad.status} />
      </div>
      <AdPreview ad={ad} />
    </div>
  );
}
