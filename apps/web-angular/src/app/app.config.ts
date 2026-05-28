import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';
import { baseUrlInterceptor } from './core/interceptors/base-url.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

/**
 * Application composition root: where cross-cutting providers are wired.
 * - HttpClient with our functional interceptor chain (base URL → error mapping).
 * - Router with component input binding, so route params arrive as component
 *   `input()` signals (used by the campaign detail page).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([baseUrlInterceptor, errorInterceptor])),
  ],
};
