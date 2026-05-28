import { Injectable, inject, signal } from '@angular/core';

import { ApiClient } from '../../../core/api/api-client';
import { Client } from '../../../shared/models/api.models';

/**
 * # Pattern: Facade + reactive Store (signals)
 *
 * A feature "data" service is a Facade: it hides the ApiClient and the async
 * plumbing behind a tiny, signal-based surface that components bind to directly.
 * Components never call HttpClient/ApiClient themselves — they read `clients()`
 * and call `load()`. State lives in signals, so the UI updates automatically.
 */
@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly api = inject(ApiClient);

  /** Public read-only-ish state. */
  readonly clients = signal<Client[]>([]);
  readonly loading = signal(false);

  /** Idempotent load — fetches once unless forced. */
  load(force = false): void {
    if (!force && this.clients().length > 0) {
      return;
    }
    this.loading.set(true);
    this.api.listClients().subscribe({
      next: (list) => {
        this.clients.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
