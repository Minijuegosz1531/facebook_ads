import { Injectable } from '@nestjs/common';

import { InspirationJob } from '@app/domain/models/inspiration';
import { JobStorePort } from '@app/domain/ports/job-store.port';

@Injectable()
export class InMemoryJobStore implements JobStorePort {
  private readonly store = new Map<string, InspirationJob>();

  async save(job: InspirationJob): Promise<void> {
    this.store.set(job.id, job);
  }
  async get(id: string): Promise<InspirationJob | null> {
    return this.store.get(id) ?? null;
  }
}
