"use client";

import { useState } from "react";
import Link from "next/link";
import { ClientSelector } from "@/features/clients/components/ClientSelector";
import { CampaignList } from "@/features/campaigns/components/CampaignList";
import type { Client } from "@/features/clients/types";

export default function CampaignsPage() {
  const [client, setClient] = useState<Client | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Campañas</h1>
        <Link
          href="/campaigns/new"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          Nueva campaña
        </Link>
      </div>

      <div className="max-w-sm">
        <ClientSelector value={client?.id ?? ""} onChange={setClient} />
      </div>

      <CampaignList clientId={client?.id ?? null} />
    </div>
  );
}
