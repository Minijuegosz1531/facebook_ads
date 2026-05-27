"use client";

import { useClients } from "../hooks/useClients";
import type { Client } from "../types";

export function ClientSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (client: Client) => void;
}) {
  const { data: clients, isLoading } = useClients();

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">Cliente</span>
      <select
        data-testid="client-select"
        className="w-full rounded border border-gray-300 p-2"
        value={value}
        disabled={isLoading}
        onChange={(e) => {
          const c = clients?.find((c) => c.id === e.target.value);
          if (c) onChange(c);
        }}
      >
        <option value="">Selecciona un cliente…</option>
        {clients?.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
}
