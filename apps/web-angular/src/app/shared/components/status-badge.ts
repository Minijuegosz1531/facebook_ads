import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { CampaignStatus } from '../models/api.models';

/**
 * Presentational ("dumb") component: pure inputs, no injected services, no
 * side effects. It only renders the status it is given. Uses the signal-based
 * `input()` API and `OnPush` change detection (mandatory-friendly with signals).
 */
@Component({
  selector: 'app-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" [class]="classes()">{{
    status()
  }}</span>`,
})
export class StatusBadge {
  /** Required input as a signal (Angular 17.1+/20 API). */
  readonly status = input.required<CampaignStatus>();

  /** Derived styling — recomputed only when `status` changes. */
  protected readonly classes = computed(() => {
    switch (this.status()) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAUSED':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  });
}
