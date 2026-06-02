export const STORAGE = Symbol('StoragePort');

export interface StoragePort {
  storeFromUrl(sourceUrl: string, destKey: string): Promise<string>;
}
