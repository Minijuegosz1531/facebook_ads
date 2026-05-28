import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { Client } from '../../../shared/models/api.models';
import { ClientSelector } from '../../clients/ui/client-selector';
import { InspirationService } from '../../inspiration/data/inspiration.service';
import { InspirationLoader } from '../../inspiration/ui/inspiration-loader';
import { ImageSelector } from '../../inspiration/ui/image-selector';
import { CopySelector } from '../../inspiration/ui/copy-selector';
import { AssetCombiner } from '../../inspiration/ui/asset-combiner';
import { CampaignForm, NewCampaignInput } from '../ui/campaign-form';
import { CampaignsService } from '../data/campaigns.service';
import { PublishRequestBuilder } from '../domain/publish-request.builder';

/**
 * The new-campaign wizard: the composition root where the clients, inspiration
 * and campaigns features meet. Features never import each other — this routed
 * page wires them. State is held in signals; `computed` derives the live preview
 * and the publish-enabled flag.
 */
@Component({
  selector: 'app-new-campaign-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ClientSelector,
    CampaignForm,
    InspirationLoader,
    ImageSelector,
    CopySelector,
    AssetCombiner,
  ],
  template: `
    <div class="max-w-4xl space-y-8">
      <h1 class="text-2xl font-bold">Nueva campaña</h1>

      <section class="max-w-sm">
        <app-client-selector [selectedId]="client()?.id ?? null" (selected)="onClient($event)" />
      </section>

      @if (client() && !started()) {
        <app-campaign-form [submitting]="inspiration.isRunning()" (submitted)="onFormSubmitted($event)" />
      }

      @if (started() && inspiration.isRunning()) {
        <app-inspiration-loader />
      }

      @if (inspiration.isReady()) {
        <section class="space-y-6">
          <app-image-selector
            [images]="inspiration.images()"
            [selectedIndex]="imageIndex()"
            (select)="imageIndex.set($event)"
          />
          <app-copy-selector
            [copies]="inspiration.copies()"
            [selectedIndex]="copyIndex()"
            (select)="copyIndex.set($event)"
          />
          <div>
            <h3 class="mb-2 text-sm font-medium">Preview</h3>
            <app-asset-combiner [image]="selectedImage()" [copy]="selectedCopy()" />
          </div>
          <button
            class="rounded bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-50"
            [disabled]="!canPublish()"
            (click)="onPublish()"
          >
            {{ publishing() ? 'Publicando…' : 'Crear campaña (PAUSED)' }}
          </button>
        </section>
      }
    </div>
  `,
})
export class NewCampaignPage implements OnDestroy {
  protected readonly inspiration = inject(InspirationService);
  private readonly campaigns = inject(CampaignsService);
  private readonly router = inject(Router);

  protected readonly client = signal<Client | null>(null);
  protected readonly form = signal<NewCampaignInput | null>(null);
  protected readonly started = signal(false);
  protected readonly imageIndex = signal<number | null>(null);
  protected readonly copyIndex = signal<number | null>(null);
  protected readonly publishing = signal(false);

  protected readonly selectedImage = computed(() => {
    const i = this.imageIndex();
    return i === null ? null : (this.inspiration.images()[i] ?? null);
  });
  protected readonly selectedCopy = computed(() => {
    const i = this.copyIndex();
    return i === null ? null : (this.inspiration.copies()[i] ?? null);
  });
  protected readonly canPublish = computed(
    () => this.imageIndex() !== null && this.copyIndex() !== null && !this.publishing(),
  );

  protected onClient(client: Client): void {
    this.client.set(client);
  }

  protected onFormSubmitted(input: NewCampaignInput): void {
    const client = this.client();
    if (!client) return;
    this.form.set(input);
    this.started.set(true);
    this.inspiration.start({
      client_id: client.id,
      client_name: client.name,
      product: input.name,
      description: input.description,
      objective: input.objective,
      country: input.country,
      platforms: input.platforms,
    });
  }

  protected onPublish(): void {
    const client = this.client();
    const form = this.form();
    const job = this.inspiration.job();
    const imageIndex = this.imageIndex();
    const copyIndex = this.copyIndex();
    if (!client || !form || !job || imageIndex === null || copyIndex === null) return;

    const req = new PublishRequestBuilder()
      .forJob(job.job_id)
      .forClient(client)
      .withCampaign(form)
      .withSelection(imageIndex, copyIndex)
      .build();

    this.publishing.set(true);
    this.campaigns.publish(req).subscribe({
      next: (campaign) => this.router.navigate(['/campaigns', campaign.id]),
      error: () => this.publishing.set(false),
    });
  }

  ngOnDestroy(): void {
    // Stop polling if the user leaves mid-flow.
    this.inspiration.reset();
  }
}
