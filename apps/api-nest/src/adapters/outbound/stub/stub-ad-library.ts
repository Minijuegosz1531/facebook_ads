import { Injectable } from '@nestjs/common';

import { ReferenceAd } from '@app/domain/models/inspiration';
import { AdLibraryPort } from '@app/domain/ports/ad-library.port';

@Injectable()
export class StubAdLibrary implements AdLibraryPort {
  async searchTopAds(
    keywords: string[],
    _country: string,
    _platforms: string[],
    limit: number,
  ): Promise<ReferenceAd[]> {
    const kw = keywords.join(' ') || 'producto';
    return Array.from({ length: limit }, (_, i) => ({
      body: `Descubre ${kw} — oferta por tiempo limitado #${i + 1}`,
      title: `Anuncio ${kw} ${i + 1}`,
      snapshotUrl: `https://facebook.com/ads/library/?id=stub${i}`,
      impressions: 100_000 - i * 7_500,
    }));
  }
}
