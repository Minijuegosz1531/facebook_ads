import { Copy, ReferenceAd } from '../models/inspiration';

export const COPY_GENERATOR = Symbol('CopyGeneratorPort');

export interface CopyGeneratorPort {
  extractKeywords(description: string): Promise<string[]>;
  generateCopies(
    refs: ReferenceAd[],
    clientName: string,
    product: string,
    objective: string,
    country: string,
    count: number,
  ): Promise<Copy[]>;
}
