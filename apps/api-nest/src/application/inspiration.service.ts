import { Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { InspirationJob } from '../domain/models/inspiration';
import { JOB_STORE, JobStorePort } from '../domain/ports/job-store.port';
import { AttachImageUseCase } from '../domain/use-cases/attach-image.use-case';
import {
  GenerateInspirationCommand,
  GenerateInspirationUseCase,
} from '../domain/use-cases/generate-inspiration.use-case';

@Injectable()
export class InspirationService {
  private readonly log = new Logger(InspirationService.name);

  constructor(
    @Inject(JOB_STORE) private readonly jobStore: JobStorePort,
    private readonly generate: GenerateInspirationUseCase,
    private readonly attach: AttachImageUseCase,
  ) {}

  /**
   * Persists a pending job and kicks the pipeline off in the background. The
   * HTTP layer can respond 202 immediately; the frontend polls until ready.
   * In production this would enqueue a Bull/BullMQ job — kept in-process here
   * to match the Go and Python stub modes.
   */
  async startAndRun(cmd: GenerateInspirationCommand): Promise<InspirationJob> {
    const job: InspirationJob = {
      id: cmd.jobId,
      clientId: cmd.clientId,
      keywords: [],
      country: cmd.country,
      platforms: cmd.platforms,
      status: 'pending',
      referenceAds: [],
      assets: { images: [], copies: [] },
      higgsfieldRequestIds: [],
      createdAt: new Date(),
    };
    await this.jobStore.save(job);

    // Fire-and-forget: don't block the response.
    void this.generate.execute(cmd).catch((err) => {
      this.log.error(`Background inspiration failed for job ${cmd.jobId}: ${err}`);
    });

    return job;
  }

  get(jobId: string): Promise<InspirationJob | null> {
    return this.jobStore.get(jobId);
  }

  attachImage(jobId: string, requestId: string, imageUrl: string): Promise<void> {
    return this.attach.execute(jobId, requestId, imageUrl);
  }

  static newJobId(): string {
    return `job_${randomBytes(12).toString('hex')}`;
  }
}
