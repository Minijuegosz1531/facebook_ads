"use server";

import { z } from "zod";
import { backend } from "@/shared/lib/backend";
import type { InspirationJob } from "@/shared/types/api";

const inputSchema = z.object({
  clientId: z.string().uuid(),
  clientName: z.string().min(1),
  product: z.string().min(1),
  description: z.string().min(10).max(500),
  objective: z.string(),
  country: z.string().length(2),
  platforms: z.array(z.string()).min(1),
});

export type StartInspirationResult =
  | { ok: true; job: InspirationJob }
  | { ok: false; error: string };

export async function startInspiration(
  input: z.infer<typeof inputSchema>,
): Promise<StartInspirationResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const job = await backend.startInspiration({
    client_id: parsed.data.clientId,
    client_name: parsed.data.clientName,
    product: parsed.data.product,
    description: parsed.data.description,
    objective: parsed.data.objective,
    country: parsed.data.country,
    platforms: parsed.data.platforms,
  });
  return { ok: true, job };
}
