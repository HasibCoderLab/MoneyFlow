import type { AccountType } from '@moneyflow/contracts';

import type { TranslationKey } from '@/lib/i18n/translations';

/** Display labels for the account kinds in requirements.md §5.3. */
export const ACCOUNT_TYPES: readonly AccountType[] = [
  'CASH',
  'BANK',
  'MOBILE_WALLET',
  'SAVINGS',
  'OTHER',
];

export const ACCOUNT_TYPE_LABEL_KEY: Record<AccountType, TranslationKey> = {
  CASH: 'accounts.type.CASH',
  BANK: 'accounts.type.BANK',
  MOBILE_WALLET: 'accounts.type.MOBILE_WALLET',
  SAVINGS: 'accounts.type.SAVINGS',
  OTHER: 'accounts.type.OTHER',
};
