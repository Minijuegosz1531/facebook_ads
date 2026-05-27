"use client";

import { useState } from "react";
import { campaignSchema, OBJECTIVES, type CampaignFormData } from "../schemas/campaign.schema";

const PLATFORMS = ["facebook", "instagram"] as const;

export function CampaignForm({
  clientId,
  submitting,
  onSubmit,
}: {
  clientId: string;
  submitting?: boolean;
  onSubmit: (data: CampaignFormData) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const raw = {
      clientId,
      name: String(fd.get("name") ?? ""),
      description: String(fd.get("description") ?? ""),
      objective: String(fd.get("objective") ?? ""),
      budgetType: String(fd.get("budgetType") ?? "campaign"),
      budgetAmount: Number(fd.get("budgetAmount") ?? 0) * 100,
      country: String(fd.get("country") ?? ""),
      platforms: PLATFORMS.filter((p) => fd.get(`platform-${p}`) === "on"),
      linkUrl: String(fd.get("linkUrl") ?? ""),
    };
    const parsed = campaignSchema.safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      return;
    }
    setError(null);
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="campaign-form">
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Nombre</span>
        <input name="name" data-testid="field-name" className="w-full rounded border border-gray-300 p-2" />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Descripción</span>
        <textarea
          name="description"
          data-testid="field-description"
          rows={3}
          className="w-full rounded border border-gray-300 p-2"
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Objetivo</span>
          <select name="objective" data-testid="field-objective" className="w-full rounded border border-gray-300 p-2">
            {OBJECTIVES.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">País (ISO-2)</span>
          <input name="country" data-testid="field-country" defaultValue="CO" maxLength={2} className="w-full rounded border border-gray-300 p-2" />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Tipo de presupuesto</span>
          <select name="budgetType" data-testid="field-budget-type" className="w-full rounded border border-gray-300 p-2">
            <option value="campaign">Campaña (CBO)</option>
            <option value="adset">Adset</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">Presupuesto (USD)</span>
          <input
            name="budgetAmount"
            data-testid="field-budget-amount"
            type="number"
            min={1}
            defaultValue={50}
            className="w-full rounded border border-gray-300 p-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">URL de destino</span>
        <input
          name="linkUrl"
          data-testid="field-link-url"
          defaultValue="https://example.com/producto"
          className="w-full rounded border border-gray-300 p-2"
        />
      </label>

      <fieldset>
        <span className="mb-1 block text-sm font-medium">Plataformas</span>
        <div className="flex gap-4">
          {PLATFORMS.map((p) => (
            <label key={p} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name={`platform-${p}`} defaultChecked data-testid={`platform-${p}`} />
              {p}
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p data-testid="form-error" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        data-testid="submit-campaign-form"
        disabled={submitting}
        className="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {submitting ? "Generando…" : "Generar inspiración"}
      </button>
    </form>
  );
}
