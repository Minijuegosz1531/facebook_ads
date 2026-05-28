import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { BudgetType } from '../../../shared/models/api.models';

export const OBJECTIVES = [
  'OUTCOME_TRAFFIC',
  'OUTCOME_SALES',
  'OUTCOME_LEADS',
  'OUTCOME_AWARENESS',
] as const;

/** Everything the wizard needs from the form (superset of the publish payload). */
export interface NewCampaignInput {
  name: string;
  description: string;
  objective: string;
  budgetType: BudgetType;
  budgetAmount: number; // cents
  country: string;
  linkUrl: string;
  platforms: string[];
}

/**
 * # Pattern: Reactive Forms (Angular's typed form model)
 *
 * The form's shape, validators and state live in a typed FormGroup built with
 * NonNullableFormBuilder — declarative validation instead of hand-rolled checks.
 * The component is presentational w.r.t. data: it owns only form state and emits
 * a validated NewCampaignInput via `output()`; it never touches a service.
 */
@Component({
  selector: 'app-campaign-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <form class="space-y-4" [formGroup]="form" (ngSubmit)="onSubmit()">
      <label class="block">
        <span class="mb-1 block text-sm font-medium">Nombre</span>
        <input class="w-full rounded border border-gray-300 p-2" formControlName="name" />
      </label>

      <label class="block">
        <span class="mb-1 block text-sm font-medium">Descripción</span>
        <textarea class="w-full rounded border border-gray-300 p-2" rows="3" formControlName="description"></textarea>
      </label>

      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Objetivo</span>
          <select class="w-full rounded border border-gray-300 p-2" formControlName="objective">
            @for (o of objectives; track o) {
              <option [value]="o">{{ o }}</option>
            }
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium">País (ISO-2)</span>
          <input class="w-full rounded border border-gray-300 p-2" maxlength="2" formControlName="country" />
        </label>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Tipo de presupuesto</span>
          <select class="w-full rounded border border-gray-300 p-2" formControlName="budgetType">
            <option value="campaign">Campaña (CBO)</option>
            <option value="adset">Adset</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium">Presupuesto (USD)</span>
          <input type="number" min="1" class="w-full rounded border border-gray-300 p-2" formControlName="budgetUsd" />
        </label>
      </div>

      <label class="block">
        <span class="mb-1 block text-sm font-medium">URL de destino</span>
        <input class="w-full rounded border border-gray-300 p-2" formControlName="linkUrl" />
      </label>

      <fieldset>
        <span class="mb-1 block text-sm font-medium">Plataformas</span>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" formControlName="facebook" /> facebook
          </label>
          <label class="flex items-center gap-2 text-sm">
            <input type="checkbox" formControlName="instagram" /> instagram
          </label>
        </div>
      </fieldset>

      @if (form.invalid && form.touched) {
        <p class="text-sm text-red-600">Revisa los campos: nombre (3-100), descripción (10-500), URL válida.</p>
      }

      <button
        type="submit"
        class="rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        [disabled]="submitting() || form.invalid"
      >
        {{ submitting() ? 'Generando…' : 'Generar inspiración' }}
      </button>
    </form>
  `,
})
export class CampaignForm {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly submitting = input(false);
  readonly submitted = output<NewCampaignInput>();

  protected readonly objectives = OBJECTIVES;

  protected readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]),
    description: this.fb.control('', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]),
    objective: this.fb.control<string>('OUTCOME_SALES', Validators.required),
    country: this.fb.control('CO', [Validators.required, Validators.minLength(2), Validators.maxLength(2)]),
    budgetType: this.fb.control<BudgetType>('campaign', Validators.required),
    budgetUsd: this.fb.control(50, [Validators.required, Validators.min(1)]),
    linkUrl: this.fb.control('https://example.com/producto', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/),
    ]),
    facebook: this.fb.control(true),
    instagram: this.fb.control(true),
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const platforms: string[] = [];
    if (v.facebook) platforms.push('facebook');
    if (v.instagram) platforms.push('instagram');

    this.submitted.emit({
      name: v.name,
      description: v.description,
      objective: v.objective,
      budgetType: v.budgetType,
      budgetAmount: v.budgetUsd * 100,
      country: v.country,
      linkUrl: v.linkUrl,
      platforms,
    });
  }
}
