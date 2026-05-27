"use client";

import Link from "next/link";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { formatBudget } from "@/shared/lib/utils";
import { useCampaigns } from "../hooks/useCampaigns";

export function CampaignList({ clientId }: { clientId: string | null }) {
  const { data: campaigns, isLoading } = useCampaigns(clientId);

  if (!clientId) {
    return <p className="text-sm text-gray-500">Selecciona un cliente para ver sus campañas.</p>;
  }
  if (isLoading) return <p>Cargando campañas…</p>;
  if (!campaigns?.length) {
    return (
      <p data-testid="campaigns-empty" className="text-sm text-gray-500">
        Este cliente aún no tiene campañas.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-gray-200" data-testid="campaigns-list">
      {campaigns.map((c) => (
        <li key={c.id} className="flex items-center justify-between py-3">
          <div>
            <Link href={`/campaigns/${c.id}`} className="font-medium hover:underline">
              {c.name}
            </Link>
            <div className="text-sm text-gray-500">
              {c.objective} · {formatBudget(c.budget_amount)}
            </div>
          </div>
          <StatusBadge status={c.status} />
        </li>
      ))}
    </ul>
  );
}
