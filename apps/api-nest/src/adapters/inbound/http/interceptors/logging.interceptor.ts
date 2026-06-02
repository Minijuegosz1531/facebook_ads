import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * # Pattern: Interceptor (Decorator / Around-advice)
 *
 * Wraps every handler with cross-cutting behavior — logs method, path, status
 * and elapsed time without each controller having to know about it.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly log = new Logger('HTTP');

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const req = ctx.switchToHttp().getRequest<Request>();
    const res = ctx.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      tap(() =>
        this.log.log(`${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`),
      ),
    );
  }
}
