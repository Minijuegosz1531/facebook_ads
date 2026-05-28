import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Presentational skeleton shown while the AI pipeline runs. */
@Component({
  selector: 'app-inspiration-loader',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <p class="text-sm text-gray-600">Generando imágenes y copies con IA…</p>
      <div class="grid grid-cols-5 gap-3">
        @for (i of placeholders; track i) {
          <div class="aspect-square animate-pulse rounded bg-gray-200"></div>
        }
      </div>
    </div>
  `,
})
export class InspirationLoader {
  protected readonly placeholders = [0, 1, 2, 3, 4];
}
