import { ReferenceAd } from '../models/inspiration';

export const AD_LIBRARY = Symbol('AdLibraryPort');

export interface AdLibraryPort {
  searchTopAds(
    keywords: string[],
    country: string,
    platforms: string[],
    limit: number,
  ): Promise<ReferenceAd[]>;
}
