import type { AccountType } from '@moneyflow/contracts';

/** Display labels for the account kinds in requirements.md §5.3. */
export const ACCOUNT_TYPES: readonly AccountType[] = [
  'CASH',
  'BANK',
  'MOBILE_WALLET',
  'SAVINGS',
  'OTHER',
];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  CASH: 'Cash',
  BANK: 'Bank account',
  MOBILE_WALLET: 'Mobile wallet',
  SAVINGS: 'Savings account',
  OTHER: 'Other',
};
