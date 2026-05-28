import { ChangeDetectionStrategy, Component, OnInit, inject, input, output } from '@angular/core';

import { ClientsService } from '../data/clients.service';
import { Client } from '../../../shared/models/api.models';

/**
 * A self-contained selector widget. It injects the ClientsService facade to load
 * its options (a "smart" leaf), and communicates the choice upward via the
 * signal-based `output()` API — the parent stays in control of what to do with
 * the selection (Mediator-ish: children talk to the page, not to each other).
 */
@Component({
  selector: 'app-client-selector',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <label class="block">
      <span class="mb-1 block text-sm font-medium">Cliente</span>
      <select
        class="w-full rounded border border-gray-300 p-2"
        [disabled]="clientsService.loading()"
        [value]="selectedId() ?? ''"
        (change)="onChange($event)"
      >
        <option value="">Selecciona un cliente…</option>
        @for (c of clientsService.clients(); track c.id) {
          <option [value]="c.id">{{ c.name }}</option>
        }
      </select>
    </label>
  `,
})
export class ClientSelector implements OnInit {
  protected readonly clientsService = inject(ClientsService);

  readonly selectedId = input<string | null>(null);
  readonly selected = output<Client>();

  ngOnInit(): void {
    this.clientsService.load();
  }

  protected onChange(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    const client = this.clientsService.clients().find((c) => c.id === id);
    if (client) {
      this.selected.emit(client);
    }
  }
}
