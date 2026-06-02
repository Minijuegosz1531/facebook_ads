import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { ApplicationModule } from './application/application.module';
import { DomainExceptionFilter } from './adapters/inbound/http/filters/domain-exception.filter';
import { LoggingInterceptor } from './adapters/inbound/http/interceptors/logging.interceptor';
import { PortsModule } from './infrastructure/ports.module';

import { CampaignsHttpModule } from './modules/campaigns.module';
import { ClientsHttpModule } from './modules/clients.module';
import { HealthModule } from './modules/health.module';
import { InspirationHttpModule } from './modules/inspiration.module';
import { WebhooksHttpModule } from './modules/webhooks.module';

/**
 * Root module: composes infrastructure (Ports), application (services), and the
 * HTTP feature modules. Global exception filter + logging interceptor are wired
 * here via the APP_FILTER / APP_INTERCEPTOR tokens — Nest's way of registering
 * them globally without touching every controller.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PortsModule,
    ApplicationModule,
    HealthModule,
    ClientsHttpModule,
    CampaignsHttpModule,
    InspirationHttpModule,
    WebhooksHttpModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
