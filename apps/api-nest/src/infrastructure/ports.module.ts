import { Global, Module } from '@nestjs/common';

import { AD_LIBRARY } from '@app/domain/ports/ad-library.port';
import { AD_PLATFORM } from '@app/domain/ports/ad-platform.port';
import { CAMPAIGN_REPOSITORY } from '@app/domain/ports/campaign-repository.port';
import { CLIENT_REPOSITORY } from '@app/domain/ports/client-repository.port';
import { COPY_GENERATOR } from '@app/domain/ports/copy-generator.port';
import { IMAGE_GENERATOR } from '@app/domain/ports/image-generator.port';
import { JOB_STORE } from '@app/domain/ports/job-store.port';
import { STORAGE } from '@app/domain/ports/storage.port';

import { InMemoryCampaignRepository } from '@app/adapters/outbound/stub/in-memory-campaign-repository';
import { InMemoryClientRepository } from '@app/adapters/outbound/stub/in-memory-client-repository';
import { InMemoryJobStore } from '@app/adapters/outbound/stub/in-memory-job-store';
import { StubAdLibrary } from '@app/adapters/outbound/stub/stub-ad-library';
import { StubAdPlatform } from '@app/adapters/outbound/stub/stub-ad-platform';
import { StubCopyGenerator } from '@app/adapters/outbound/stub/stub-copy-generator';
import { StubImageGenerator } from '@app/adapters/outbound/stub/stub-image-generator';
import { StubStorage } from '@app/adapters/outbound/stub/stub-storage';

/**
 * # Pattern: Composition Root (NestJS Module + Factory Providers)
 *
 * The ONLY place that binds concrete adapters to ports. Today every binding is
 * a stub; switching to production swaps a `useClass` for the real adapter (or
 * a `useFactory` for env-driven selection). The domain and use cases never see
 * these classes — they only see the port interfaces.
 *
 * `@Global()` makes the providers visible to every module without re-importing.
 */
@Global()
@Module({
  providers: [
    { provide: AD_PLATFORM, useClass: StubAdPlatform },
    { provide: CAMPAIGN_REPOSITORY, useClass: InMemoryCampaignRepository },
    { provide: CLIENT_REPOSITORY, useClass: InMemoryClientRepository },
    { provide: AD_LIBRARY, useClass: StubAdLibrary },
    { provide: IMAGE_GENERATOR, useClass: StubImageGenerator },
    { provide: COPY_GENERATOR, useClass: StubCopyGenerator },
    { provide: STORAGE, useClass: StubStorage },
    { provide: JOB_STORE, useClass: InMemoryJobStore },
  ],
  exports: [
    AD_PLATFORM,
    CAMPAIGN_REPOSITORY,
    CLIENT_REPOSITORY,
    AD_LIBRARY,
    IMAGE_GENERATOR,
    COPY_GENERATOR,
    STORAGE,
    JOB_STORE,
  ],
})
export class PortsModule {}
