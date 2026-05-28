import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Copy } from '../../../shared/models/api.models';

/** Presentational list of generated copies; emits the chosen index upward. */
@Component({
  selector: 'app-copy-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="mb-2 text-sm font-medium">Copies generados</h3>
    <ul class="space-y-2">
      @for (copy of copies(); track $index; let i = $index) {
        <li>
          <button
            type="button"
            class="w-full rounded border p-3 text-left"
            [class.border-blue-600]="selectedIndex() === i"
            [class.bg-blue-50]="selectedIndex() === i"
            [class.border-gray-200]="selectedIndex() !== i"
            (click)="select.emit(i)"
          >
            <div class="font-medium">{{ copy.headline }}</div>
            <div class="text-sm text-gray-600">{{ copy.body }}</div>
            <div class="mt-1 text-xs uppercase text-gray-400">{{ copy.cta }}</div>
          </button>
        </li>
      }
    </ul>
  `,
})
export class CopySelector {
  readonly copies = input.required<Copy[]>();
  readonly selectedIndex = input<number | null>(null);
  readonly select = output<number>();
}
