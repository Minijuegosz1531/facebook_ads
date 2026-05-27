export type { InspirationJob, Copy, JobStatus } from "@/shared/types/api";

export interface StartInspirationInput {
  client_id: string;
  client_name: string;
  product: string;
  description: string;
  objective: string;
  country: string;
  platforms: string[];
}
