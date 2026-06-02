import { Inject, Injectable } from '@nestjs/common';

import { NotFoundError } from '../errors/domain.errors';
import { JOB_STORE, JobStorePort } from '../ports/job-store.port';
import { STORAGE, StoragePort } from '../ports/storage.port';

/**
 * Higgsfield webhook handler: persists the finished image to permanent storage
 * (Higgsfield URLs expire in 7 days) and attaches it to the job, flipping the
 * job to "ready" once all assets are in.
 */
@Injectable()
export class AttachImageUseCase {
  constructor(
    @Inject(STORAGE) private readonly storage: StoragePort,
    @Inject(JOB_STORE) private readonly jobStore: JobStorePort,
  ) {}

  async execute(jobId: string, requestId: string, imageUrl: string): Promise<void> {
    const job = await this.jobStore.get(jobId);
    if (!job) {
      throw new NotFoundError(`Job ${jobId} not found`);
    }
    const destKey = `inspiration/${jobId}/${requestId}.jpg`;
    const permanent = await this.storage.storeFromUrl(imageUrl, destKey);
    job.assets.images.push({ url: permanent, requestId });
    if (
      job.assets.images.length >= job.higgsfieldRequestIds.length &&
      job.assets.copies.length > 0
    ) {
      job.status = 'ready';
    }
    await this.jobStore.save(job);
  }
}
