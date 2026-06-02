/**
 * Domain error hierarchy. Use cases throw these; the HTTP layer's
 * DomainExceptionFilter maps each subclass to the right status code (404/400/…).
 * Keeping error semantics in the domain keeps the layers honest.
 */

export abstract class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends DomainError {}
export class ValidationError extends DomainError {}
export class InvalidStateError extends DomainError {}
export class AdPlatformError extends DomainError {}
