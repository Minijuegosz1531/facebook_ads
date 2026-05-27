"use client";

// Composition root for the new-campaign wizard: this route wires together the
// clients, campaigns and inspiration features. Features never import each other.

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ClientSelector } from "@/features/clients/components/ClientSelector";
import type { Client } from "@/features/clients/types";

import { CampaignForm } from "@/features/campaigns/components/CampaignForm";
import { startInspiration } from "@/features/campaigns/actions/startInspiration";
import { publishCampaign } from "@/features/campaigns/actions/publishCampaign";
import type { CampaignFormData } from "@/features/campaigns/schemas/campaign.schema";

import { InspirationLoader } from "@/features/inspiration/components/InspirationLoader";
import { ImageSelector } from "@/features/inspiration/components/ImageSelector";
import { CopySelector } from "@/features/inspiration/components/CopySelector";
import { AssetCombiner } from "@/features/inspiration/components/AssetCombiner";
import { useInspirationJob } from "@/features/inspiration/hooks/useInspirationJob";
import { useAssetSelection } from "@/features/inspiration/hooks/useAssetSelection";

export default function NewCampaignPage() {
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [form, setForm] = useState<CampaignFormData | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isReady, images, copies } = useInspirationJob(jobId);
  const selection = useAssetSelection();

  async function handleFormSubmit(data: CampaignFormData) {
    if (!client) return;
    setSubmitting(true);
    setError(null);
    const res = await startInspiration({
      clientId: client.id,
      clientName: client.name,
      product: data.name,
      description: data.description,
      objective: data.objective,
      country: data.country,
      platforms: data.platforms,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setForm(data);
    setJobId(res.job.job_id);
  }

  async function handlePublish() {
    if (!client || !form || !jobId || !selection.isComplete) return;
    setPublishing(true);
    setError(null);
    const res = await publishCampaign({
      jobId,
      clientId: client.id,
      adAccountId: client.meta_ad_account_id,
      name: form.name,
      objective: form.objective,
      budgetType: form.budgetType,
      budgetAmount: form.budgetAmount,
      pageId: client.meta_page_id ?? "",
      pixelId: client.meta_pixel_id,
      linkUrl: form.linkUrl,
      imageIndex: selection.imageIndex!,
      copyIndex: selection.copyIndex!,
    });
    setPublishing(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push(`/campaigns/${res.campaign.id}`);
  }

  return (
    <div className="max-w-4xl space-y-8">
      <h1 className="text-2xl font-bold">Nueva campaña</h1>

      <section className="max-w-sm">
        <ClientSelector value={client?.id ?? ""} onChange={setClient} />
      </section>

      {client && !jobId && (
        <section>
          <CampaignForm clientId={client.id} submitting={submitting} onSubmit={handleFormSubmit} />
        </section>
      )}

      {jobId && !isReady && <InspirationLoader />}

      {jobId && isReady && (
        <section className="space-y-6" data-testid="inspiration-results">
          <ImageSelector
            images={images}
            selected={selection.imageIndex}
            onSelect={selection.setImageIndex}
          />
          <CopySelector
            copies={copies}
            selected={selection.copyIndex}
            onSelect={selection.setCopyIndex}
          />

          <div>
            <h3 className="mb-2 text-sm font-medium">Preview</h3>
            <AssetCombiner
              image={selection.imageIndex !== null ? images[selection.imageIndex] : null}
              copy={selection.copyIndex !== null ? copies[selection.copyIndex] : null}
            />
          </div>

          <button
            data-testid="publish-campaign"
            disabled={!selection.isComplete || publishing}
            onClick={handlePublish}
            className="rounded bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          >
            {publishing ? "Publicando…" : "Crear campaña (PAUSED)"}
          </button>
        </section>
      )}

      {error && (
        <p data-testid="wizard-error" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
