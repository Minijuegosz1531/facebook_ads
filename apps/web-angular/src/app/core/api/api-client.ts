import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  Campaign,
  Client,
  InspirationJob,
  Insights,
  PublishFromJobRequest,
  StartInspirationRequest,
} from '../../shared/models/api.models';

/**
 * # Pattern: Adapter (a.k.a. Gateway / typed HTTP client)
 *
 * ApiClient adapts Angular's generic `HttpClient` into a small, strongly-typed
 * surface that speaks the backend's vocabulary (clients, campaigns, jobs). It
 * issues RELATIVE paths — the baseUrlInterceptor prepends `/api` — so this class
 * never hard-codes a host. Feature services (facades) depend on this, not on
 * HttpClient directly, which keeps endpoint knowledge in one place.
 *
 * It returns Observables (the framework's async primitive); the feature facades
 * decide how to expose that to components (usually as signals).
 */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);

  // ── Clients ──────────────────────────────────────────────────────────
  listClients(): Observable<Client[]> {
    return this.http.get<Client[]>('clients');
  }

  getClient(id: string): Observable<Client> {
    return this.http.get<Client>(`clients/${id}`);
  }

  // ── Campaigns ────────────────────────────────────────────────────────
  listCampaigns(clientId: string): Observable<Campaign[]> {
    return this.http.get<Campaign[]>('campaigns', {
      params: new HttpParams().set('client_id', clientId),
    });
  }

  getCampaign(id: string): Observable<Campaign> {
    return this.http.get<Campaign>(`campaigns/${id}`);
  }

  publishFromJob(req: PublishFromJobRequest): Observable<Campaign> {
    return this.http.post<Campaign>('campaigns/publish-from-job', req);
  }

  updateStatus(id: string, status: string): Observable<Campaign> {
    return this.http.patch<Campaign>(`campaigns/${id}/status`, { status });
  }

  deleteCampaign(id: string): Observable<void> {
    return this.http.delete<void>(`campaigns/${id}`);
  }

  getInsights(id: string): Observable<Insights> {
    return this.http.get<Insights>(`campaigns/${id}/insights`);
  }

  // ── Inspiration ──────────────────────────────────────────────────────
  startInspiration(req: StartInspirationRequest): Observable<InspirationJob> {
    return this.http.post<InspirationJob>('inspiration/search', req);
  }

  getJob(jobId: string): Observable<InspirationJob> {
    return this.http.get<InspirationJob>(`inspiration/${jobId}`);
  }
}
