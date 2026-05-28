import { Pipe, PipeTransform } from '@angular/core';

/**
 * # Pattern: Pipe (a Strategy for view formatting)
 *
 * A pure pipe is a small, reusable transformation Angular memoizes by input.
 * Budgets are stored in cents; this renders them as currency. Pure pipes are
 * the idiomatic place for presentation logic instead of methods in components.
 */
@Pipe({ name: 'budget' })
export class BudgetPipe implements PipeTransform {
  transform(cents: number, currency = 'USD'): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format((cents ?? 0) / 100);
  }
}
