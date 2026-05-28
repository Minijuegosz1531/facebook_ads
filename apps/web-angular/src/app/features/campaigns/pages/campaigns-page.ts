import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { Client } from '../../../shared/models/api.models';
import { ClientSelector } from '../../clients/ui/client-selector';
import { CampaignList } from '../ui/campaign-list';
import { CampaignsService } from '../data/campaigns.service';

/**
 * Routed container that composes two features (clients + campaigns) at the route
 * level — features themselves never import each other; the page wires them.
 */
@Component({
  selector: 'app-campaigns-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ClientSelector, CampaignList],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Campañas</h1>
        <a routerLink="/campaigns/new" class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">
          Nueva campaña
        </a>
      </div>

      <div class="max-w-sm">
        <app-client-selector [selectedId]="selectedClient()?.id ?? null" (selected)="onClient($event)" />
      </div>

      @if (selectedClient()) {
        @if (campaigns.loading()) {
          <p>Cargando campañas…</p>
        } @else {
          <app-campaign-list [campaigns]="campaigns.list()" />
        }
      } @else {
        <p class="text-sm text-gray-500">Selecciona un cliente para ver sus campañas.</p>
      }
    </div>
  `,
})
export class CampaignsPage {
  protected readonly campaigns = inject(CampaignsService);
  protected readonly selectedClient = signal<Client | null>(null);

  protected onClient(client: Client): void {
    this.selectedClient.set(client);
    this.campaigns.loadByClient(client.id);
  }
}
