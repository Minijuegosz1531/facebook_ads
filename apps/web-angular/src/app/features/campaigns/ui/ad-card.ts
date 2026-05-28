import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Ad } from '../../../shared/models/api.models';
import { StatusBadge } from '../../../shared/components/status-badge';
import { AdPreview } from './ad-preview';

/** Composes a status badge + ad preview. Presentational. */
@Component({
  selector: 'app-ad-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [StatusBadge, AdPreview],
  template: `
    <div class="rounded-lg border border-gray-200 p-4">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm text-gray-500">{{ ad().meta_ad_id ?? '—' }}</span>
        <app-status-badge [status]="ad().status" />
      </div>
      <app-ad-preview [ad]="ad()" />
    </div>
  `,
})
export class AdCard {
  readonly ad = input.required<Ad>();
}
