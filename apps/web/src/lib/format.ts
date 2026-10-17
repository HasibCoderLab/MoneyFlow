// Display-only formatting for the UI preview.
//
// This is NOT a financial calculation: amounts arrive as pre-formatted
// strings from mock data (later: from the API) and are only given a
// currency prefix here. Deterministic money math lives in the domain
// layer on the server (requirements.md §7.3, AGENTS.md rule 5/8).
const BDT_PREFIX = 'BDT ';

/** Formats an already-formatted amount string, e.g. "3,500" -> "BDT 3,500". */
export function formatBdt(amount: string): string {
  return `${BDT_PREFIX}${amount}`;
}

/**
 * Formats a signed amount for transaction rows. Signs are part of the text
 * (never color alone — requirements.md §7.3).
 */
export function formatSignedBdt(
  amount: string,
  direction: 'income' | 'expense' | 'transfer',
): string {
  const sign = direction === 'income' ? '+' : '\u2212'; // U+2212 minus sign
  return `${sign}${BDT_PREFIX}${amount}`;
}
