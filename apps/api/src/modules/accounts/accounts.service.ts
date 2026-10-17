import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AccountResponse, AccountStatus, AccountType } from '@moneyflow/contracts';

import { assertUuid, isUniqueViolationFor, mapMoneyError } from '../../common/http-errors';
import { parseOpeningBalanceToMinor, toContractString } from '../../domain/money/amount';
import type { Account as PrismaAccount } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { deriveAccountBalance, type BalanceLeg } from './balance';
import { parseCreateAccountInput, parseUpdateAccountInput } from './dto';

/** Prisma delegates used here; the interactive-transaction client included. */
type DbClient = Pick<PrismaService, 'account' | 'transaction' | 'category'>;

const ACCOUNT_NAME_CONFLICT_INDEX = 'account_userId_name_lower_key';

/**
 * Accounts domain service (IT-4, requirements.md §5.3, accounting-rules.md
 * §5, §11.4).
 *
 * - Every query is scoped to the session-derived `userId`; unknown or
 *   foreign ids answer 404 without distinguishing the two cases.
 * - Balances are always derived (opening + signed effects), never stored.
 * - `openingBalanceMinor` becomes immutable once the account has any
 *   transaction; later corrections are `ADJUSTMENT` rows (IT-4/IT-7).
 * - Archiving preserves history; there is no account delete in MVP.
 * - Single-row writes still run inside a database transaction (§4.1, §5.4).
 */
@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  public async createAccount(userId: string, body: unknown): Promise<AccountResponse> {
    let input;
    try {
      input = parseCreateAccountInput(body);
    } catch (error) {
      throw mapMoneyError(error);
    }
    let openingBalanceMinor: bigint;
    try {
      openingBalanceMinor = parseOpeningBalanceToMinor(input.openingBalance, input.currency);
    } catch (error) {
      throw mapMoneyError(error);
    }

    try {
      const account = await this.prisma.$transaction((tx) =>
        tx.account.create({
          data: {
            userId,
            name: input.name,
            type: input.type,
            currency: input.currency,
            openingBalanceMinor,
          },
        }),
      );
      // A new account has no transactions: balance equals the opening balance.
      return toAccountResponse(account, openingBalanceMinor);
    } catch (error) {
      if (isUniqueViolationFor(error, ACCOUNT_NAME_CONFLICT_INDEX)) {
        throw new ConflictException('An account with this name already exists.');
      }
      throw error;
    }
  }

  public async listAccounts(userId: string): Promise<AccountResponse[]> {
    const accounts = await this.prisma.account.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (accounts.length === 0) {
      return [];
    }
    const legs = await this.loadLegs(this.prisma, userId);
    const byAccount = groupLegsByAccount(legs);
    return accounts.map((account) =>
      toAccountResponse(
        account,
        deriveAccountBalance(
          account.openingBalanceMinor,
          account.id,
          byAccount.get(account.id) ?? [],
        ),
      ),
    );
  }

  public async getAccount(userId: string, rawId: string): Promise<AccountResponse> {
    const id = assertUuid(rawId, 'Account');
    const account = await this.prisma.account.findFirst({ where: { id, userId } });
    if (!account) {
      throw new NotFoundException('Account not found.');
    }
    const legs = await this.loadLegs(this.prisma, userId, id);
    return toAccountResponse(account, deriveAccountBalance(account.openingBalanceMinor, id, legs));
  }

  public async updateAccount(
    userId: string,
    rawId: string,
    body: unknown,
  ): Promise<AccountResponse> {
    let input;
    try {
      input = parseUpdateAccountInput(body);
    } catch (error) {
      throw mapMoneyError(error);
    }
    const id = assertUuid(rawId, 'Account');

    try {
      const account = await this.prisma.$transaction(async (tx) => {
        const current = await tx.account.findFirst({ where: { id, userId } });
        if (!current) {
          throw new NotFoundException('Account not found.');
        }

        let openingBalanceMinor = current.openingBalanceMinor;
        if (input.openingBalance !== undefined) {
          const transactionCount = await tx.transaction.count({
            where: { userId, OR: legsFilter(id) },
          });
          if (transactionCount > 0) {
            throw new BadRequestException(
              'Opening balance is frozen once the account has transactions ' +
                '(OPENING_BALANCE_FROZEN). Record an adjustment instead.',
            );
          }
          try {
            openingBalanceMinor = parseOpeningBalanceToMinor(
              input.openingBalance,
              current.currency,
            );
          } catch (error) {
            throw mapMoneyError(error);
          }
        }

        if (input.name === undefined && input.openingBalance === undefined) {
          return current;
        }
        return tx.account.update({
          where: { id },
          data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.openingBalance !== undefined ? { openingBalanceMinor } : {}),
          },
        });
      });

      const legs = await this.loadLegs(this.prisma, userId, id);
      return toAccountResponse(
        account,
        deriveAccountBalance(account.openingBalanceMinor, id, legs),
      );
    } catch (error) {
      if (isUniqueViolationFor(error, ACCOUNT_NAME_CONFLICT_INDEX)) {
        throw new ConflictException('An account with this name already exists.');
      }
      throw error;
    }
  }

  public async archiveAccount(userId: string, rawId: string): Promise<AccountResponse> {
    return this.setArchived(userId, rawId, true);
  }

  public async unarchiveAccount(userId: string, rawId: string): Promise<AccountResponse> {
    return this.setArchived(userId, rawId, false);
  }

  private async setArchived(
    userId: string,
    rawId: string,
    archived: boolean,
  ): Promise<AccountResponse> {
    const id = assertUuid(rawId, 'Account');
    const account = await this.prisma.$transaction(async (tx) => {
      const current = await tx.account.findFirst({ where: { id, userId } });
      if (!current) {
        throw new NotFoundException('Account not found.');
      }
      if ((current.status === 'ARCHIVED') === archived) {
        return current;
      }
      return tx.account.update({
        where: { id },
        data: {
          status: archived ? 'ARCHIVED' : 'ACTIVE',
          archivedAt: archived ? new Date() : null,
        },
      });
    });

    const legs = await this.loadLegs(this.prisma, userId, id);
    return toAccountResponse(account, deriveAccountBalance(account.openingBalanceMinor, id, legs));
  }

  /** Every stored leg touching `accountId` (or all of the user's legs). */
  private async loadLegs(db: DbClient, userId: string, accountId?: string): Promise<BalanceLeg[]> {
    const where = accountId === undefined ? { userId } : { userId, OR: legsFilter(accountId) };
    const rows = await db.transaction.findMany({
      where,
      select: {
        type: true,
        amountMinor: true,
        accountId: true,
        fromAccountId: true,
        toAccountId: true,
        adjustmentSign: true,
      },
    });
    return rows;
  }
}

/** Matches transactions where the account appears on any leg. */
function legsFilter(accountId: string) {
  return [{ accountId }, { fromAccountId: accountId }, { toAccountId: accountId }];
}

function groupLegsByAccount(legs: readonly BalanceLeg[]): Map<string, BalanceLeg[]> {
  const grouped = new Map<string, BalanceLeg[]>();
  const add = (accountId: string | null, leg: BalanceLeg) => {
    if (accountId === null) {
      return;
    }
    const list = grouped.get(accountId);
    if (list) {
      list.push(leg);
    } else {
      grouped.set(accountId, [leg]);
    }
  };
  for (const leg of legs) {
    if (leg.type === 'TRANSFER') {
      add(leg.fromAccountId, leg);
      add(leg.toAccountId, leg);
    } else {
      add(leg.accountId, leg);
    }
  }
  return grouped;
}

function toAccountResponse(account: PrismaAccount, balanceMinor: bigint): AccountResponse {
  return {
    id: account.id,
    name: account.name,
    type: account.type as AccountType,
    status: account.status as AccountStatus,
    currency: account.currency,
    openingBalanceMinor: toContractString(account.openingBalanceMinor),
    balanceMinor: toContractString(balanceMinor),
    archivedAt: account.archivedAt ? account.archivedAt.toISOString() : null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
  };
}
