import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Campaign } from '../../../shared/models/api.models';
import { StatusBadge } from '../../../shared/components/status-badge';
import { BudgetPipe } from '../../../shared/pipes/budget.pipe';

/** Presentational list; receives campaigns via input and links to detail. */
@Component({
  selector: 'app-campaign-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadge, BudgetPipe],
  template: `
    @if (campaigns().length === 0) {
      <p class="text-sm text-gray-500">Este cliente aún no tiene campañas.</p>
    } @else {
      <ul class="divide-y divide-gray-200">
        @for (c of campaigns(); track c.id) {
          <li class="flex items-center justify-between py-3">
            <div>
              <a [routerLink]="['/campaigns', c.id]" class="font-medium hover:underline">{{ c.name }}</a>
              <div class="text-sm text-gray-500">{{ c.objective }} · {{ c.budget_amount | budget }}</div>
            </div>
            <app-status-badge [status]="c.status" />
          </li>
        }
      </ul>
    }
  `,
})
export class CampaignList {
  readonly campaigns = input.required<Campaign[]>();
}
