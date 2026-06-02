import { Injectable } from '@nestjs/common';

import { Client } from '@app/domain/models/client';
import { ClientRepositoryPort } from '@app/domain/ports/client-repository.port';

const SEED: readonly Client[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Cafetería Andina',
    metaAdAccountId: 'act_1001',
    metaPageId: 'page_1001',
    metaPixelId: 'pixel_1001',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Moda Tropical',
    metaAdAccountId: 'act_1002',
    metaPageId: 'page_1002',
    metaPixelId: 'pixel_1002',
  },
];

@Injectable()
export class InMemoryClientRepository implements ClientRepositoryPort {
  async listAll(): Promise<Client[]> {
    return [...SEED];
  }
  async get(id: string): Promise<Client | null> {
    return SEED.find((c) => c.id === id) ?? null;
  }
}
