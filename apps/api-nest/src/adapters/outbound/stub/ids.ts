let seq = 0;
/** Deterministic id helper used by every in-memory stub. */
export const nextId = (prefix: string): string =>
  `${prefix}_${(++seq).toString().padStart(6, '0')}`;
