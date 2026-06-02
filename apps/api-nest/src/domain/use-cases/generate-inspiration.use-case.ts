import { Inject, Injectable, Logger } from '@nestjs/common';

import { GeneratedImage, InspirationJob } from '../models/inspiration';
import { AD_LIBRARY, AdLibraryPort } from '../ports/ad-library.port';
import { COPY_GENERATOR, CopyGeneratorPort } from '../ports/copy-generator.port';
import { IMAGE_GENERATOR, ImageGeneratorPort } from '../ports/image-generator.port';
import { JOB_STORE, JobStorePort } from '../ports/job-store.port';

export interface GenerateInspirationCommand {
  jobId: string;
  clientId: string;
  clientName: string;
  product: string;
  description: string;
  objective: string;
  country: string;
  webhookBaseUrl: string;
  platforms: string[];
  imageCount: number;
  copyCount: number;
}

/**
 * Pipeline: keywords → Ad Library → (images ∥ copies in parallel) → persist.
 *
 * The two AI calls are fired with `Promise.all` so they run concurrently — the
 * JS/Node analogue of the Go goroutines + WaitGroup.
 */
@Injectable()
export class GenerateInspirationUseCase {
  private readonly log = new Logger(GenerateInspirationUseCase.name);

  constructor(
    @Inject(AD_LIBRARY) private readonly adLibrary: AdLibraryPort,
    @Inject(IMAGE_GENERATOR) private readonly imageGen: ImageGeneratorPort,
    @Inject(COPY_GENERATOR) private readonly copyGen: CopyGeneratorPort,
    @Inject(JOB_STORE) private readonly jobStore: JobStorePort,
  ) {}

  async execute(cmd: GenerateInspirationCommand): Promise<InspirationJob> {
    const existing = await this.jobStore.get(cmd.jobId);
    const job: InspirationJob = existing ?? {
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

    try {
      // ── Phase 1: keywords + Ad Library ──────────────────────────────
      job.status = 'searching';
      await this.jobStore.save(job);

      job.keywords = await this.copyGen.extractKeywords(cmd.description);
      job.referenceAds = await this.adLibrary.searchTopAds(
        job.keywords,
        cmd.country,
        cmd.platforms,
        5,
      );

      // ── Phase 2: images ∥ copies in parallel ────────────────────────
      job.status = 'generating';
      await this.jobStore.save(job);

      const webhookUrl = `${cmd.webhookBaseUrl.replace(/\/$/, '')}/webhooks/higgsfield/${job.id}`;
      const [requestIds, copies] = await Promise.all([
        this.imageGen.generate(job.referenceAds, cmd.product, cmd.country, webhookUrl, cmd.imageCount),
        this.copyGen.generateCopies(
          job.referenceAds,
          cmd.clientName,
          cmd.product,
          cmd.objective,
          cmd.country,
          cmd.copyCount,
        ),
      ]);
      job.higgsfieldRequestIds = requestIds;
      job.assets.copies = copies;
      // Stub generators return ready URLs directly; the Higgsfield webhook
      // fills these in for real generation.
      job.assets.images = requestIds
        .filter((r) => r.startsWith('http'))
        .map<GeneratedImage>((url) => ({ url, requestId: url }));

      job.status = 'ready';
      await this.jobStore.save(job);
      return job;
    } catch (err) {
      job.status = 'failed';
      job.error = err instanceof Error ? err.message : String(err);
      this.log.error(`Inspiration job ${job.id} failed: ${job.error}`);
      await this.jobStore.save(job);
      throw err;
    }
  }
}
