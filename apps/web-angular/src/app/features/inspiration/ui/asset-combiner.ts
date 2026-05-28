import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { Copy } from '../../../shared/models/api.models';

/** Live Facebook-style preview of the selected image + copy. */
@Component({
  selector: 'app-asset-combiner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (image() && copy(); as ready) {
      <div class="max-w-sm rounded-lg border border-gray-200">
        <img [src]="image()!" alt="preview" class="aspect-square w-full rounded-t-lg object-cover" />
        <div class="p-3">
          <div class="font-semibold">{{ copy()!.headline }}</div>
          <p class="text-sm text-gray-600">{{ copy()!.body }}</p>
          <button class="mt-2 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white">
            {{ copy()!.cta.replace('_', ' ') }}
          </button>
        </div>
      </div>
    } @else {
      <div class="rounded border border-dashed border-gray-300 p-6 text-sm text-gray-500">
        Selecciona una imagen y un copy para ver el preview.
      </div>
    }
  `,
})
export class AssetCombiner {
  readonly image = input<string | null>(null);
  readonly copy = input<Copy | null>(null);
}
