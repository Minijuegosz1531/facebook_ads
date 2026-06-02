import { Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';

import { CLIENT_REPOSITORY, ClientRepositoryPort } from '@app/domain/ports/client-repository.port';
import { toClientResponse } from '../mappers/api.mapper';

@Controller('clients')
export class ClientsController {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepositoryPort,
  ) {}

  @Get()
  async list() {
    return (await this.clients.listAll()).map(toClientResponse);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    const c = await this.clients.get(id);
    if (!c) throw new NotFoundException('Client not found');
    return toClientResponse(c);
  }
}
