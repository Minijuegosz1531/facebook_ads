import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { NotificationService } from '../../core/notifications/notification.service';

/**
 * Renders notifications from the NotificationService. It observes the service's
 * signal directly in the template (`@for` over `notifications.items()`), which
 * is the Observer pattern realized with signals: push on one side, reactive read
 * on the other, no manual subscription.
 */
@Component({
  selector: 'app-toast',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      @for (n of notifications.items(); track n.id) {
        <div
          class="rounded px-4 py-2 text-sm text-white shadow"
          [class]="n.kind === 'error' ? 'bg-red-600' : 'bg-gray-800'"
          (click)="notifications.dismiss(n.id)"
        >
          {{ n.message }}
        </div>
      }
    </div>
  `,
})
export class Toast {
  protected readonly notifications = inject(NotificationService);
}
