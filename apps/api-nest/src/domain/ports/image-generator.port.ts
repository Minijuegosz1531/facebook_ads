import { ReferenceAd } from '../models/inspiration';

export const IMAGE_GENERATOR = Symbol('ImageGeneratorPort');

export interface ImageGeneratorPort {
  generate(
    refs: ReferenceAd[],
    product: string,
    country: string,
    webhookUrl: string,
    count: number,
  ): Promise<string[]>;
}
