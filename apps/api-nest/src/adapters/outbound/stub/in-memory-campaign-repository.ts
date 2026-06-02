import { Injectable } from '@nestjs/common';

import { Campaign, CampaignStatus } from '@app/domain/models/campaign';
import { CampaignRepositoryPort } from '@app/domain/ports/campaign-repository.port';
import { nextId } from './ids';

/**
 * Single-process in-memory store. Node is single-threaded per process, so
 * concurrent requests in the same process don't race on the map.
 */
@Injectable()
export class InMemoryCampaignRepository implements CampaignRepositoryPort {
  private readonly store = new Map<string, Campaign>();

  async save(c: Campaign): Promise<Campaign> {
    if (!c.id) c.id = nextId('camp');
    this.store.set(c.id, c);
    return c;
  }

  async get(id: string): Promise<Campaign | null> {
    return this.store.get(id) ?? null;
  }

  async listByClient(clientId: string): Promise<Campaign[]> {
    return [...this.store.values()].filter((c) => c.clientId === clientId);
  }

  async updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null> {
    const c = this.store.get(id);
    if (!c) return null;
    c.status = status;
    c.ads = c.ads.map((a) => ({ ...a, status }));
    c.updatedAt = new Date();
    return c;
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}
