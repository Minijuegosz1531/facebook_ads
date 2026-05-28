import { InjectionToken } from '@angular/core';

/**
 * # Pattern: Dependency Injection via InjectionToken
 *
 * Rather than hard-coding the API base path inside services, we publish it as an
 * injectable token. Tests (or a different deployment) can override it through
 * Angular's DI without touching any consumer. The default `/api` is rewritten to
 * the real microservice by Angular's dev proxy (see proxy.conf.json).
 */
export const API_BASE_PATH = new InjectionToken<string>('API_BASE_PATH', {
  providedIn: 'root',
  factory: () => '/api',
});
