import { Campaign, CampaignStatus } from '../models/campaign';

export const CAMPAIGN_REPOSITORY = Symbol('CampaignRepositoryPort');

export interface CampaignRepositoryPort {
  save(c: Campaign): Promise<Campaign>;
  get(id: string): Promise<Campaign | null>;
  listByClient(clientId: string): Promise<Campaign[]>;
  updateStatus(id: string, status: CampaignStatus): Promise<Campaign | null>;
  delete(id: string): Promise<void>;
}
