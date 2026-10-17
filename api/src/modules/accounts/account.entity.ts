export enum AccountType {
  CASH = 'CASH',
  BANK = 'BANK',
  MOBILE_WALLET = 'MOBILE_WALLET',
  SAVINGS = 'SAVINGS',
  OTHER = 'OTHER',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export interface AccountEntity {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor: bigint;
  status: AccountStatus;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
