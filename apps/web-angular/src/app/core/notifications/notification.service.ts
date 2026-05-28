import { Injectable, signal } from '@angular/core';

export interface Notification {
  id: number;
  kind: 'error' | 'info';
  message: string;
}

/**
 * # Pattern: Observer (via Angular signals) + singleton Service
 *
 * A single root-provided service holds the notification state in a signal.
 * Producers (e.g. the error interceptor) push messages; the toast component
 * reads the signal reactively. Neither side references the other — the signal
 * is the observable subject they share. `providedIn: 'root'` makes it a
 * lazily-created singleton (Angular's DI is the Singleton + Service Locator).
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private seq = 0;
  /** Read-only view of current notifications for consumers. */
  readonly items = signal<Notification[]>([]);

  error(message: string): void {
    this.push('error', message);
  }

  info(message: string): void {
    this.push('info', message);
  }

  dismiss(id: number): void {
    this.items.update((list) => list.filter((n) => n.id !== id));
  }

  private push(kind: Notification['kind'], message: string): void {
    const item: Notification = { id: ++this.seq, kind, message };
    this.items.update((list) => [...list, item]);
    // Auto-dismiss after 5s.
    setTimeout(() => this.dismiss(item.id), 5000);
  }
}
