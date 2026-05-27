"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backend } from "@/shared/lib/backend";
import type { Campaign } from "@/shared/types/api";

const inputSchema = z.object({
  jobId: z.string().min(1),
  clientId: z.string().uuid(),
  adAccountId: z.string().min(1),
  name: z.string().min(3).max(100),
  objective: z.string(),
  budgetType: z.enum(["campaign", "adset"]),
  budgetAmount: z.number().int().min(100),
  pageId: z.string().min(1),
  pixelId: z.string().nullable().optional(),
  linkUrl: z.string().url(),
  imageIndex: z.number().int().min(0),
  copyIndex: z.number().int().min(0),
});

export type PublishResult =
  | { ok: true; campaign: Campaign }
  | { ok: false; error: string };

export async function publishCampaign(
  input: z.infer<typeof inputSchema>,
): Promise<PublishResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const d = parsed.data;
  try {
    const campaign = await backend.publishFromJob({
      job_id: d.jobId,
      client_id: d.clientId,
      ad_account_id: d.adAccountId,
      name: d.name,
      objective: d.objective,
      budget_type: d.budgetType,
      budget_amount: d.budgetAmount,
      page_id: d.pageId,
      pixel_id: d.pixelId ?? null,
      link_url: d.linkUrl,
      image_index: d.imageIndex,
      copy_index: d.copyIndex,
    });
    revalidatePath("/campaigns");
    return { ok: true, campaign };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
