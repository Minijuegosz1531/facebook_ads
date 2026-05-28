import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';

import { CampaignsService } from '../data/campaigns.service';
import { AdCard } from '../ui/ad-card';
import { StatusBadge } from '../../../shared/components/status-badge';
import { BudgetPipe } from '../../../shared/pipes/budget.pipe';

/**
 * Campaign detail (smart container). The route param `id` arrives as an input
 * signal thanks to `withComponentInputBinding()`; an `effect` reloads the
 * campaign whenever it changes. The status toggle uses the facade's optimistic
 * update.
 */
@Component({
  selector: 'app-campaign-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdCard, StatusBadge, BudgetPipe],
  template: `
    @if (campaigns.loading() && !campaign()) {
      <p>Cargando campaña…</p>
    } @else if (campaign(); as c) {
      <div class="space-y-6">
        <header class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold">{{ c.name }}</h1>
            <p class="text-sm text-gray-500">
              {{ c.objective }} · {{ c.budget_amount | budget }} ·
              {{ c.budget_type === 'campaign' ? 'CBO' : 'Adset budget' }}
            </p>
          </div>
          <div class="flex items-center gap-3">
            <app-status-badge [status]="c.status" />
            <button
              class="rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white"
              (click)="toggle(c.id, c.status)"
            >
              {{ c.status === 'ACTIVE' ? 'Pausar' : 'Activar' }}
            </button>
          </div>
        </header>

        <section>
          <h2 class="mb-3 text-lg font-semibold">Anuncios</h2>
          <div class="flex flex-wrap gap-4">
            @for (ad of c.ads; track ad.meta_ad_id) {
              <app-ad-card [ad]="ad" />
            }
          </div>
        </section>
      </div>
    } @else {
      <p>Campaña no encontrada.</p>
    }
  `,
})
export class CampaignDetailPage {
  protected readonly campaigns = inject(CampaignsService);

  /** Bound from the route param `:id` via withComponentInputBinding(). */
  readonly id = input.required<string>();

  protected readonly campaign = this.campaigns.current;

  constructor() {
    // Reactively (re)load whenever the route id changes.
    effect(() => {
      const id = this.id();
      if (id) {
        this.campaigns.load(id);
      }
    });
  }

  protected toggle(id: string, status: string): void {
    this.campaigns.updateStatus(id, status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE');
  }
}
