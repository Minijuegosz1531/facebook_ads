import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

import {
  AdPlatformError,
  DomainError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from '@app/domain/errors/domain.errors';

/**
 * # Pattern: Exception Filter (Nest's translation of Chain-of-Responsibility)
 *
 * The single place that maps domain errors to HTTP status codes. Use cases and
 * services throw `NotFoundError`, `ValidationError`, etc.; this filter turns
 * them into the right response. Adding a new domain error means adding one case
 * here — handlers stay clean.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger(DomainExceptionFilter.name);

  catch(err: DomainError, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();
    const status = this.statusFor(err);
    if (status >= 500) {
      this.log.error(`${err.name}: ${err.message}`);
    }
    res.status(status).json({ detail: err.message });
  }

  private statusFor(err: DomainError): number {
    if (err instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (err instanceof ValidationError) return HttpStatus.BAD_REQUEST;
    if (err instanceof InvalidStateError) return HttpStatus.BAD_REQUEST;
    if (err instanceof AdPlatformError) return HttpStatus.BAD_GATEWAY;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
