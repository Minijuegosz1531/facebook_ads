import { Injectable } from '@nestjs/common';

import { Copy, ReferenceAd } from '@app/domain/models/inspiration';
import { CopyGeneratorPort } from '@app/domain/ports/copy-generator.port';

@Injectable()
export class StubCopyGenerator implements CopyGeneratorPort {
  async extractKeywords(description: string): Promise<string[]> {
    const kw = description
      .split(/\s+/)
      .map((w) => w.toLowerCase().replace(/[.,;:!¡¿?]/g, ''))
      .filter((w) => w.length > 4)
      .slice(0, 5);
    return kw.length > 0 ? kw : ['producto', 'oferta', 'calidad'];
  }

  async generateCopies(
    _refs: ReferenceAd[],
    clientName: string,
    product: string,
    _objective: string,
    country: string,
    count: number,
  ): Promise<Copy[]> {
    const ctas = ['SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'GET_OFFER'];
    return Array.from({ length: count }, (_, i) => ({
      headline: `${product} para ${country} — opción ${i + 1}`,
      body: `${clientName}: lo que buscabas en ${product}. ¡Aprovecha hoy!`,
      cta: ctas[i % ctas.length],
    }));
  }
}
