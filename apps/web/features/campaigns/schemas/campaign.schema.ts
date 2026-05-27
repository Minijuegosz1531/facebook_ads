import { z } from "zod";

export const OBJECTIVES = [
  "OUTCOME_TRAFFIC",
  "OUTCOME_SALES",
  "OUTCOME_LEADS",
  "OUTCOME_AWARENESS",
] as const;

export const campaignSchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  objective: z.enum(OBJECTIVES),
  budgetType: z.enum(["campaign", "adset"]),
  budgetAmount: z.number().int().min(100), // cents
  country: z.string().length(2),
  platforms: z.array(z.enum(["facebook", "instagram"])).min(1),
  linkUrl: z.string().url(),
});

export type CampaignFormData = z.infer<typeof campaignSchema>;
