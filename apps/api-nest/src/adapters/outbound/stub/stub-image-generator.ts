import { Injectable } from '@nestjs/common';

import { ReferenceAd } from '@app/domain/models/inspiration';
import { ImageGeneratorPort } from '@app/domain/ports/image-generator.port';

/**
 * # Pattern: Builder (string assembly) — `AdPromptBuilder`
 *
 * Same idea as in the Go service: assembles the prompt by fragments. Kept here
 * so the stub generator can show the construction the real Higgsfield adapter
 * would perform — only the transport differs between stub and real.
 */
export class AdPromptBuilder {
  private product = '';
  private country = '';
  private style = '';
  forProduct(p: string): this {
    this.product = p;
    return this;
  }
  inMarket(c: string): this {
    this.country = c;
    return this;
  }
  styledAfter(refs: ReferenceAd[]): this {
    this.style = refs
      .slice(0, 3)
      .map((r) => r.body.slice(0, 100))
      .join(' ');
    return this;
  }
  build(): string {
    return (
      `Professional Facebook/Instagram ad image. Product: ${this.product}. ` +
      `Market: ${this.country} Latin America. High-contrast, clean background, ` +
      `product hero shot. Inspired by top-performing ads: ${this.style}. ` +
      `No text overlays. Photorealistic.`
    );
  }
}

@Injectable()
export class StubImageGenerator implements ImageGeneratorPort {
  async generate(
    refs: ReferenceAd[],
    product: string,
    country: string,
    _webhookUrl: string,
    count: number,
  ): Promise<string[]> {
    // Build the prompt (no-op for the stub, but documents the real flow).
    void new AdPromptBuilder().forProduct(product).inMarket(country).styledAfter(refs).build();
    const seed = product.toLowerCase().replace(/\s+/g, '-') || 'ad';
    return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/${seed}-${i}/600/600`);
  }
}
