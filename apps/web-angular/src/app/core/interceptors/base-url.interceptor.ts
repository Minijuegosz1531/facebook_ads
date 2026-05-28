import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { API_BASE_PATH } from '../api/api-config';

/**
 * # Pattern: Chain of Responsibility (functional HTTP interceptor)
 *
 * Angular's HTTP pipeline is a chain of interceptors; each one may transform the
 * request, pass it on (`next`), and transform the response. This interceptor
 * prefixes the configured base path onto relative URLs, so services can request
 * clean paths like `clients` or `campaigns/123` and stay unaware of where the
 * backend actually lives. Absolute URLs (http...) are left untouched.
 *
 * Functional interceptors (HttpInterceptorFn) are the modern, tree-shakable
 * replacement for class-based `HttpInterceptor`.
 */
export const baseUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_PATH);
  const isAbsolute = /^https?:\/\//i.test(req.url);
  if (isAbsolute) {
    return next(req);
  }
  const path = req.url.replace(/^\/+/, '');
  return next(req.clone({ url: `${base}/${path}` }));
};
