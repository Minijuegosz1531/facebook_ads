import 'reflect-metadata';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

/**
 * Entrypoint: bootstrap the Nest app, enable a global ValidationPipe
 * (Pipe pattern / Strategy for input validation) and start the HTTP server.
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip unknown properties
      forbidNonWhitelisted: true, // 400 if the request has unknown fields
      transform: true, // turn plain JSON into class instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Nest API listening on http://localhost:${port}`);
}

void bootstrap();
