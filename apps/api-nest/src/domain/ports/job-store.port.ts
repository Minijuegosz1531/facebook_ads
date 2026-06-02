import { InspirationJob } from '../models/inspiration';

export const JOB_STORE = Symbol('JobStorePort');

export interface JobStorePort {
  save(job: InspirationJob): Promise<void>;
  get(id: string): Promise<InspirationJob | null>;
}
