/**
 * Public surface of the money domain (IT-1): strict parsing, contract-string
 * conversion, exact integer arithmetic, currency metadata, display
 * percentages, and the pure transaction effect matrix.
 *
 * No Prisma, no HTTP, no timezone/period logic — see ADR-0003/ADR-0004 and
 * `docs/architecture/accounting-rules.md`.
 */
export * from './errors';
export * from './currency';
export * from './amount';
export * from './arithmetic';
export * from './percentage';
export * from './effects';
