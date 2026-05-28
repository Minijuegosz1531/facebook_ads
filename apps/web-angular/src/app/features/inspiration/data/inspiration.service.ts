import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, interval, switchMap, takeWhile } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { InspirationJob, StartInspirationRequest } from '../../../shared/models/api.models';

/**
 * # Pattern: Facade + Observer (RxJS polling) exposed as signals
 *
 * The inspiration job is asynchronous: the API returns a "pending" job and we
 * poll until it is "ready". This facade encapsulates that protocol — RxJS
 * `interval` + `switchMap` + `takeWhile` drives the polling (the reactive
 * Observer pattern), and the latest state is published as a signal so templates
 * bind to it without managing subscriptions.
 */
@Injectable({ providedIn: 'root' })
export class InspirationService {
  private readonly api = inject(ApiClient);
  private pollSub?: Subscription;

  readonly job = signal<InspirationJob | null>(null);

  // Derived, read-only view state.
  readonly isReady = computed(() => this.job()?.status === 'ready');
  readonly isFailed = computed(() => this.job()?.status === 'failed');
  readonly isRunning = computed(() => {
    const s = this.job()?.status;
    return s === 'pending' || s === 'searching' || s === 'generating';
  });
  readonly images = computed(() => this.job()?.generated_images ?? []);
  readonly copies = computed(() => this.job()?.generated_copies ?? []);

  /** Kick off the pipeline and begin polling until it terminates. */
  start(req: StartInspirationRequest): void {
    this.reset();
    this.api.startInspiration(req).subscribe((job) => {
      this.job.set(job);
      if (job.status !== 'ready' && job.status !== 'failed') {
        this.poll(job.job_id);
      }
    });
  }

  /** Clear state and cancel any in-flight polling (call when leaving the flow). */
  reset(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = undefined;
    this.job.set(null);
  }

  private poll(jobId: string): void {
    this.pollSub = interval(2000)
      .pipe(
        switchMap(() => this.api.getJob(jobId)),
        // Emit the terminal value too (inclusive), then complete.
        takeWhile((j) => j.status !== 'ready' && j.status !== 'failed', true),
      )
      .subscribe((j) => this.job.set(j));
  }
}
