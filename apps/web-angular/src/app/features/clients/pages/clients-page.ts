import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';

import { ClientsService } from '../data/clients.service';

/**
 * Routed "smart" component (container): it talks to the facade and renders the
 * list. Container components are the only ones that touch services; the rest
 * stay presentational.
 */
@Component({
  selector: 'app-clients-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="mb-4 text-2xl font-bold">Clientes</h1>
    @if (clientsService.loading()) {
      <p>Cargando clientes…</p>
    } @else {
      <ul class="divide-y divide-gray-200">
        @for (c of clientsService.clients(); track c.id) {
          <li class="flex items-center justify-between py-3">
            <span class="font-medium">{{ c.name }}</span>
            <span class="text-sm text-gray-500">{{ c.meta_ad_account_id }}</span>
          </li>
        }
      </ul>
    }
  `,
})
export class ClientsPage implements OnInit {
  protected readonly clientsService = inject(ClientsService);

  ngOnInit(): void {
    this.clientsService.load();
  }
}
