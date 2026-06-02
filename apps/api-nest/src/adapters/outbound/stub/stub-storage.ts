import { Injectable } from '@nestjs/common';

import { StoragePort } from '@app/domain/ports/storage.port';

/** Real adapter would re-host on GCS; the stub treats the source URL as final. */
@Injectable()
export class StubStorage implements StoragePort {
  async storeFromUrl(sourceUrl: string, _destKey: string): Promise<string> {
    return sourceUrl;
  }
}
