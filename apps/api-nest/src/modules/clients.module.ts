import { Module } from '@nestjs/common';

import { ClientsController } from '@app/adapters/inbound/http/controllers/clients.controller';

// PortsModule is @Global, so the controller can inject CLIENT_REPOSITORY directly.
@Module({
  controllers: [ClientsController],
})
export class ClientsHttpModule {}
