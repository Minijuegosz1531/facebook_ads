"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { backend } from "@/shared/lib/backend";
import type { Campaign } from "@/shared/types/api";

const inputSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]),
});

export async function updateStatus(
  input: z.infer<typeof inputSchema>,
): Promise<Campaign> {
  const { id, status } = inputSchema.parse(input);
  const campaign = await backend.updateStatus(id, status);
  revalidatePath(`/campaigns/${id}`);
  revalidatePath("/campaigns");
  return campaign;
}
