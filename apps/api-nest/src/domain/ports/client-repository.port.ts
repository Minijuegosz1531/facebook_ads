import { Client } from '../models/client';

export const CLIENT_REPOSITORY = Symbol('ClientRepositoryPort');

export interface ClientRepositoryPort {
  listAll(): Promise<Client[]>;
  get(id: string): Promise<Client | null>;
}
