import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Ad } from '../../../shared/models/api.models';

/** Facebook-style preview of a persisted ad. Pure presentational. */
@Component({
  selector: 'app-ad-preview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-sm rounded-lg border border-gray-200">
      <img [src]="ad().image_url" [alt]="ad().headline" class="aspect-square w-full rounded-t-lg object-cover" />
      <div class="p-3">
        <div class="font-semibold">{{ ad().headline }}</div>
        <p class="text-sm text-gray-600">{{ ad().body }}</p>
        <button class="mt-2 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white">
          {{ ad().cta.replace('_', ' ') }}
        </button>
      </div>
    </div>
  `,
})
export class AdPreview {
  readonly ad = input.required<Ad>();
}
