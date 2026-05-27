"use client";

import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatBudget } from "@/shared/lib/utils";
import { useCampaignDetail } from "../hooks/useCampaignDetail";
import { useCampaignStatus } from "../hooks/useCampaignStatus";
import { AdCard } from "./AdCard";

export function CampaignDetail({ id }: { id: string }) {
  const { data: campaign, isLoading } = useCampaignDetail(id);
  const statusMutation = useCampaignStatus(id);

  if (isLoading) return <p>Cargando campaña…</p>;
  if (!campaign) return <p>Campaña no encontrada.</p>;

  const nextStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="campaign-name">
            {campaign.name}
          </h1>
          <p className="text-sm text-gray-500">
            {campaign.objective} · {formatBudget(campaign.budget_amount)} ·{" "}
            {campaign.budget_type === "campaign" ? "CBO" : "Adset budget"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={campaign.status} />
          <button
            data-testid="toggle-status"
            disabled={statusMutation.isPending}
            onClick={() => statusMutation.mutate(nextStatus)}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {campaign.status === "ACTIVE" ? "Pausar" : "Activar"}
          </button>
        </div>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Anuncios</h2>
        <div className="flex flex-wrap gap-4">
          {campaign.ads.map((ad, i) => (
            <AdCard key={ad.meta_ad_id ?? i} ad={ad} />
          ))}
        </div>
      </section>
    </div>
  );
}
