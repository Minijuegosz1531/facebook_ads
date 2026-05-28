import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/** Presentational grid of generated images; emits the chosen index upward. */
@Component({
  selector: 'app-image-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="mb-2 text-sm font-medium">Imágenes generadas</h3>
    <div class="grid grid-cols-5 gap-3">
      @for (url of images(); track url; let i = $index) {
        <button
          type="button"
          class="aspect-square overflow-hidden rounded border-2"
          [class.border-blue-600]="selectedIndex() === i"
          [class.border-transparent]="selectedIndex() !== i"
          [attr.aria-pressed]="selectedIndex() === i"
          (click)="select.emit(i)"
        >
          <img [src]="url" [alt]="'Opción ' + (i + 1)" class="h-full w-full object-cover" />
        </button>
      }
    </div>
  `,
})
export class ImageSelector {
  readonly images = input.required<string[]>();
  readonly selectedIndex = input<number | null>(null);
  readonly select = output<number>();
}
