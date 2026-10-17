import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountRepository } from './account.repository';
import { AccountType, AccountStatus } from './account-type.enum';
import { TransactionRepository } from '../transactions/transaction.repository';
import { Account } from '@prisma/client';

@Injectable()
export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async findAll(userId: string): Promise<Account[]> {
    return this.accountRepository.findAll(userId);
  }

  async findOne(id: string, userId: string): Promise<Account> {
    const account = await this.accountRepository.findOne(id, userId);
    if (!account) {
      throw new NotFoundException(`Account with ID ${id} not found`);
    }
    return account;
  }

  async create(
    userId: string,
    name: string,
    type: AccountType,
    currency: string,
    openingBalanceMinor: bigint,
  ): Promise<Account> {
    // Opening balance validation: must be within ±10^11 service cap
    const balanceCap = 10n ** 11n; // 100 billion minor units = 1 billion BDT
    if (openingBalanceMinor < -balanceCap || openingBalanceMinor > balanceCap) {
      throw new Error(`Opening balance exceeds the ±10^11 minor-unit service cap`);
    }

    return this.accountRepository.create({
      userId,
      name,
      type,
      currency,
      openingBalanceMinor,
      status: AccountStatus.ACTIVE,
    });
  }

  async update(
    id: string,
    userId: string,
    name?: string,
    status?: AccountStatus,
  ): Promise<Account> {
    const account = await this.findOne(id, userId);

    if (name) {
      account.name = name;
    }

    if (status) {
      account.status = status;
    }

    return this.accountRepository.update(id, account);
  }

  async archive(id: string, userId: string): Promise<Account> {
    const account = await this.findOne(id, userId);

    // Check if account has transactions - if so, archive (preserve history)
    // If no transactions, we could allow hard delete, but per ADR-0004 we archive
    const hasTransactions = await this.transactionRepository.hasAccountTransactions(id, userId);

    if (hasTransactions) {
      account.status = AccountStatus.ARCHIVED;
      account.archivedAt = new Date();
      return this.accountRepository.update(id, account);
    }

    // Account has no transactions - we could archive or delete
    // Per the model: archive preserves history, but if no history, archive is still valid
    account.status = AccountStatus.ARCHIVED;
    account.archivedAt = new Date();
    return this.accountRepository.update(id, account);
  }

  async getBalance(id: string, userId: string): Promise<bigint> {
    const account = await this.findOne(id, userId);

    // Derive balance from transactions:
    // openingBalanceMinor + income - expenses + adjustments + net transfers
    const transactions = await this.transactionRepository.findByAccount(id, userId);

    let derivedBalance = account.openingBalanceMinor;

    for (const tx of transactions) {
      if (tx.type === 'INCOME') {
        derivedBalance += tx.amountMinor;
      } else if (tx.type === 'EXPENSE') {
        derivedBalance -= tx.amountMinor;
      } else if (tx.type === 'TRANSFER') {
        // Transfer: if fromAccount, subtract; if toAccount, add
        // We only count the portion relevant to this account
        if (tx.fromAccountId === id) {
          derivedBalance -= tx.amountMinor;
        }
        if (tx.toAccountId === id) {
          derivedBalance += tx.amountMinor;
        }
      } else if (tx.type === 'ADJUSTMENT') {
        // Adjustment sign determines direction
        if (tx.adjustmentSign === 1) {
          derivedBalance += tx.amountMinor;
        } else if (tx.adjustmentSign === -1) {
          derivedBalance -= tx.amountMinor;
        }
      }
    }

    return derivedBalance;
  }

  async validateOpeningBalance(
    id: string,
    userId: string,
    newOpeningBalanceMinor: bigint,
  ): Promise<boolean> {
    const account = await this.findOne(id, userId);

    // Opening balance becomes immutable once account has transactions
    const hasTransactions = await this.transactionRepository.hasAccountTransactions(id, userId);

    if (hasTransactions) {
      // Cannot change opening balance if there are transactions
      // Corrections must be made via ADJUSTMENT transactions
      return false;
    }

    // Validate within service cap
    const balanceCap = 10n ** 11n;
    if (newOpeningBalanceMinor < -balanceCap || newOpeningBalanceMinor > balanceCap) {
      return false;
    }

    return true;
  }
}
