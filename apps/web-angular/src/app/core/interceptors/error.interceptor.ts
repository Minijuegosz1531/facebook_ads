import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { NotificationService } from '../notifications/notification.service';

/**
 * Normalizes backend errors into a single `Error` carrying the API's `detail`
 * message, and surfaces it through the NotificationService (Observer pattern:
 * components subscribe to notifications without this interceptor knowing them).
 * Sits after the base-url interceptor in the chain.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notifications = inject(NotificationService);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const detail =
        (err.error && typeof err.error === 'object' && 'detail' in err.error
          ? String((err.error as { detail: unknown }).detail)
          : err.message) || 'Error de red';
      notifications.error(detail);
      return throwError(() => new Error(detail));
    }),
  );
};
