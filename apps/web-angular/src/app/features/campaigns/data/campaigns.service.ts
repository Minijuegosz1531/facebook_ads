import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { ApiClient } from '../../../core/api/api-client';
import { Campaign, Insights, PublishFromJobRequest } from '../../../shared/models/api.models';

/**
 * Facade for everything campaign-related. Holds list/detail/insights state in
 * signals; components bind to those and call the imperative methods. Mutations
 * that the caller must react to (publish) return an Observable so the page can
 * navigate on success; pure state loads update signals directly.
 */
@Injectable({ providedIn: 'root' })
export class CampaignsService {
  private readonly api = inject(ApiClient);

  readonly list = signal<Campaign[]>([]);
  readonly current = signal<Campaign | null>(null);
  readonly insights = signal<Insights | null>(null);
  readonly loading = signal(false);

  loadByClient(clientId: string): void {
    this.loading.set(true);
    this.api.listCampaigns(clientId).subscribe({
      next: (list) => {
        this.list.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  load(id: string): void {
    this.loading.set(true);
    this.current.set(null);
    this.api.getCampaign(id).subscribe({
      next: (c) => {
        this.current.set(c);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  /** Returns the created campaign so the wizard can navigate to its detail. */
  publish(req: PublishFromJobRequest): Observable<Campaign> {
    return this.api.publishFromJob(req);
  }

  updateStatus(id: string, status: string): void {
    // Optimistic update: flip the local signal immediately, reconcile on response.
    const prev = this.current();
    if (prev) {
      this.current.set({ ...prev, status: status as Campaign['status'] });
    }
    this.api.updateStatus(id, status).subscribe({
      next: (c) => this.current.set(c),
      error: () => this.current.set(prev),
    });
  }

  loadInsights(id: string): void {
    this.api.getInsights(id).subscribe((i) => this.insights.set(i));
  }
}
