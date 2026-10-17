/**
 * Currency metadata registry (ADR-0003 §2, accounting-rules.md §11.1).
 *
 * The registry is the single authoritative source for minor-unit precision.
 * The MVP contains BDT only: any other currency code is rejected with
 * `UNSUPPORTED_CURRENCY` — never silently defaulted to BDT. Future
 * currencies are added here (exponent per ISO 4217) without touching
 * parsing logic.
 */
import { MoneyDomainError } from './errors';

export interface CurrencyMetadata {
  /** ISO 4217 currency code. */
  readonly code: string;
  /** Minor-unit digits: BDT → 2, so 3500.00 BDT = 350000 minor units. */
  readonly exponent: number;
}

/** Currency used when a caller does not specify one (MVP default). */
export const DEFAULT_CURRENCY_CODE = 'BDT';

const REGISTRY: ReadonlyMap<string, CurrencyMetadata> = new Map([
  ['BDT', { code: 'BDT', exponent: 2 } satisfies CurrencyMetadata],
]);

/**
 * Returns the metadata for `currencyCode`.
 *
 * @throws MoneyDomainError `UNSUPPORTED_CURRENCY` when the code is not in
 * the registry (including lowercase variants — codes are exact ISO 4217).
 */
export function getCurrencyMetadata(currencyCode: string): CurrencyMetadata {
  const metadata = REGISTRY.get(currencyCode);
  if (!metadata) {
    throw new MoneyDomainError(
      'UNSUPPORTED_CURRENCY',
      `Currency "${currencyCode}" is not supported yet (BDT only).`,
    );
  }
  return metadata;
}
