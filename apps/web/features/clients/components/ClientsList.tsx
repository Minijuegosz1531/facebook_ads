"use client";

import { useClients } from "../hooks/useClients";

export function ClientsList() {
  const { data: clients, isLoading } = useClients();

  if (isLoading) return <p>Cargando clientes…</p>;

  return (
    <ul className="divide-y divide-gray-200" data-testid="clients-list">
      {clients?.map((c) => (
        <li key={c.id} className="flex items-center justify-between py-3">
          <span className="font-medium">{c.name}</span>
          <span className="text-sm text-gray-500">{c.meta_ad_account_id}</span>
        </li>
      ))}
    </ul>
  );
}
