import { Injectable } from '@nestjs/common';
import type {
  CategorySpendSummary,
  DashboardResponse,
  RecentSummaryTransaction,
  ReportCategoriesResponse,
  ReportSummaryResponse,
  SummaryPeriod,
  SummaryTotals,
} from '@moneyflow/contracts';

import { toContractString } from '../../domain/money/amount';
import { DEFAULT_CURRENCY_CODE } from '../../domain/money/currency';
import { percentTimes10 } from '../../domain/money/percentage';
import { PrismaService } from '../../prisma/prisma.service';
import { deriveAccountBalance } from '../accounts/balance';
import { parseSummaryQuery } from './dto';
import {
  bucketDayTotals,
  SUMMARY_WEEK_STARTS_ON,
  type DayTotals,
  type ResolvedSummaryPeriod,
} from './summary-periods';

/**
 * Summary service (IT-8) — the single aggregation path behind
 * `GET /api/v1/dashboard`, `GET /api/v1/reports/summary`, and
 * `GET /api/v1/reports/categories` (implementation-plan.md Phase C,
 * requirements.md §5.6/§5.10, accounting-rules.md §9).
 *
 * Rules enforced here (all deterministic, none re-invented):
 * - every query is scoped to the session-derived `userId`;
 * - period filters are half-open `[fromInstant, toInstant)` on the resolved
 *   IANA timezone boundaries supplied by `resolveSummaryPeriod`;
 * - income/expense totals include only `INCOME`/`EXPENSE` records —
 *   transfers, adjustments, and opening balances never appear (§9.4); the
 *   explicit type filter also keeps any future type out of the sums until
 *   it is handled deliberately (refund note in `loadPeriodAggregates`);
 * - total tracked balance is the Σ of derived balances for ACTIVE accounts,
 *   reusing the exact `deriveAccountBalance` effect matrix as Accounts;
 * - percentages come from the half-up domain helper (`percentTimes10`);
 * - money is exact `bigint` end to end and crosses the boundary as
 *   minor-unit strings, never JSON numbers (ADR-0003, §11.1). The period
 *   aggregation uses `SUM(...)::text` so values beyond
 *   `Number.MAX_SAFE_INTEGER` cannot lose exactness in the engine.
 */
@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /api/v1/dashboard` — every widget figure the dashboard renders. */
  public async getDashboard(
    userId: string,
    query: Record<string, unknown>,
    now: Date = new Date(),
  ): Promise<DashboardResponse> {
    const parsed = parseSummaryQuery(query, now);

    const [balance, aggregates, recentTransactions, spending] = await Promise.all([
      this.loadActiveBalance(userId),
      this.loadPeriodAggregates(userId, parsed.period),
      this.loadRecentTransactions(userId, parsed.recentLimit),
      this.loadCategorySpending(userId, parsed.period),
    ]);

    return {
      period: toPeriodResponse(parsed.period),
      totalTrackedBalanceMinor: toContractString(balance.totalMinor),
      activeAccountCount: balance.accountCount,
      totals: toTotals(aggregates),
      recentTransactions,
      spendingByCategory: spending.categories,
    };
  }

  /** `GET /api/v1/reports/summary` — period totals plus a bucketed series. */
  public async getReportSummary(
    userId: string,
    query: Record<string, unknown>,
    now: Date = new Date(),
  ): Promise<ReportSummaryResponse> {
    const parsed = parseSummaryQuery(query, now);
    const aggregates = await this.loadPeriodAggregates(userId, parsed.period);

    const series = bucketDayTotals(aggregates.days, parsed.granularity, parsed.period).map(
      (bucket) => ({
        startDate: bucket.startDate,
        endDate: bucket.endDate,
        incomeMinor: toContractString(bucket.incomeMinor),
        expenseMinor: toContractString(bucket.expenseMinor),
      }),
    );

    return {
      period: toPeriodResponse(parsed.period),
      totals: toTotals(aggregates),
      granularity: parsed.granularity,
      weekStartsOn: parsed.granularity === 'weekly' ? SUMMARY_WEEK_STARTS_ON : null,
      series,
    };
  }

  /** `GET /api/v1/reports/categories` — period expenses by category. */
  public async getReportCategories(
    userId: string,
    query: Record<string, unknown>,
    now: Date = new Date(),
  ): Promise<ReportCategoriesResponse> {
    const parsed = parseSummaryQuery(query, now);
    const spending = await this.loadCategorySpending(userId, parsed.period);

    return {
      period: toPeriodResponse(parsed.period),
      totalExpenseMinor: toContractString(spending.totalExpenseMinor),
      categories: spending.categories,
    };
  }

  /**
   * Σ derived balances of the caller's ACTIVE accounts. Archived accounts
   * and their legs are excluded entirely (§9.4); the effect matrix is the
   * same tested `deriveAccountBalance` used by the accounts module.
   */
  private async loadActiveBalance(userId: string): Promise<ActiveBalanceSnapshot> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { id: true, openingBalanceMinor: true },
    });
    if (accounts.length === 0) {
      return { totalMinor: 0n, accountCount: 0 };
    }

    const accountIds = accounts.map((account) => account.id);
    const legs = await this.prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          { accountId: { in: accountIds } },
          { fromAccountId: { in: accountIds } },
          { toAccountId: { in: accountIds } },
        ],
      },
      select: {
        type: true,
        amountMinor: true,
        accountId: true,
        fromAccountId: true,
        toAccountId: true,
        adjustmentSign: true,
      },
    });

    let totalMinor = 0n;
    for (const account of accounts) {
      totalMinor += deriveAccountBalance(account.openingBalanceMinor, account.id, legs);
    }
    return { totalMinor, accountCount: accounts.length };
  }

  /**
   * One database-side aggregation for the whole period: local-day × type
   * sums with exact `::text` totals (immune to engine casts that could lose
   * precision above 2^53) plus the qualifying record count. The local-day
   * grouping uses PostgreSQL's IANA timezone conversion, so DST and offset
   * changes stay correct — clients never do timezone math.
   *
   * Refunds (accounting-rules.md §1.1): no `REFUND` type exists in the
   * schema today and the UI never offers one, so no refund rows can exist;
   * when the type is added, refund effects must be subtracted from these
   * totals here. The explicit `IN ('INCOME', 'EXPENSE')` filter guarantees
   * a newly added type is never silently counted as income or expense in
   * the meantime.
   */
  private async loadPeriodAggregates(
    userId: string,
    period: ResolvedSummaryPeriod,
  ): Promise<PeriodAggregates> {
    const rows = await this.prisma.$queryRaw<RawPeriodAggregateRow[]>`
      SELECT to_char(("occurredAt" AT TIME ZONE ${period.timezone}), 'YYYY-MM-DD') AS "localDate",
             "type"::text AS "type",
             SUM("amountMinor")::text AS "total",
             COUNT(*)::int AS "count"
      FROM "transaction"
      WHERE "userId" = ${userId}
        AND "occurredAt" >= ${period.fromInstant}
        AND "occurredAt" < ${period.toInstant}
        AND "type" IN ('INCOME', 'EXPENSE')
      GROUP BY 1, 2
      ORDER BY 1
    `;

    const byDay = new Map<string, { incomeMinor: bigint; expenseMinor: bigint }>();
    let incomeMinor = 0n;
    let expenseMinor = 0n;
    let transactionCount = 0;

    for (const row of rows) {
      const total = BigInt(row.total);
      transactionCount += row.count;
      const entry = byDay.get(row.localDate) ?? { incomeMinor: 0n, expenseMinor: 0n };
      if (row.type === 'INCOME') {
        entry.incomeMinor += total;
        incomeMinor += total;
      } else if (row.type === 'EXPENSE') {
        entry.expenseMinor += total;
        expenseMinor += total;
      }
      byDay.set(row.localDate, entry);
    }

    const days: DayTotals[] = [...byDay.entries()].map(([day, entry]) => ({
      day,
      incomeMinor: entry.incomeMinor,
      expenseMinor: entry.expenseMinor,
    }));

    return { days, incomeMinor, expenseMinor, transactionCount };
  }

  /**
   * Period expenses per category with server-computed half-up percentages.
   * Archived categories stay readable in historical totals (§5.5). Ordering
   * is deterministic: largest expense first, then `categoryId` ascending.
   */
  private async loadCategorySpending(
    userId: string,
    period: ResolvedSummaryPeriod,
  ): Promise<CategorySpending> {
    const groups = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        occurredAt: { gte: period.fromInstant, lt: period.toInstant },
      },
      _sum: { amountMinor: true },
    });

    const rows: Array<{ categoryId: string; amountMinor: bigint }> = [];
    let totalExpenseMinor = 0n;
    for (const group of groups) {
      if (group.categoryId === null) {
        // Unreachable: the type-specific CHECK constraint requires a
        // category for EXPENSE rows. Skipped defensively, never guessed.
        continue;
      }
      const amountMinor = group._sum.amountMinor ?? 0n;
      rows.push({ categoryId: group.categoryId, amountMinor });
      totalExpenseMinor += amountMinor;
    }
    if (rows.length === 0) {
      return { totalExpenseMinor, categories: [] };
    }

    const categories = await this.prisma.category.findMany({
      where: { userId, id: { in: rows.map((row) => row.categoryId) } },
      select: { id: true, name: true, color: true, status: true },
    });
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    rows.sort((a, b) => {
      if (a.amountMinor !== b.amountMinor) {
        return a.amountMinor > b.amountMinor ? -1 : 1;
      }
      return a.categoryId < b.categoryId ? -1 : a.categoryId > b.categoryId ? 1 : 0;
    });

    const summaries: CategorySpendSummary[] = [];
    for (const row of rows) {
      const category = categoryById.get(row.categoryId);
      if (!category) {
        // Unreachable: the FK plus user scoping guarantees the row exists.
        continue;
      }
      const percent = percentTimes10(row.amountMinor, totalExpenseMinor);
      summaries.push({
        categoryId: category.id,
        name: category.name,
        color: category.color,
        status: category.status,
        expenseMinor: toContractString(row.amountMinor),
        percentTimes10: percent === null ? null : percent.toString(),
      });
    }

    return { totalExpenseMinor, categories: summaries };
  }

  /**
   * Bounded recent activity enriched with category display fields.
   * Deterministic order: `occurredAt DESC, id DESC` (the exact ordering the
   * transactions list uses for paging).
   */
  private async loadRecentTransactions(
    userId: string,
    limit: number,
  ): Promise<RecentSummaryTransaction[]> {
    const rows = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        type: true,
        amountMinor: true,
        currency: true,
        occurredAt: true,
        adjustmentSign: true,
        note: true,
        categoryId: true,
      },
    });
    if (rows.length === 0) {
      return [];
    }

    const categoryIds = [
      ...new Set(
        rows
          .map((row) => row.categoryId)
          .filter((categoryId): categoryId is string => categoryId !== null),
      ),
    ];
    const categories =
      categoryIds.length === 0
        ? []
        : await this.prisma.category.findMany({
            where: { userId, id: { in: categoryIds } },
            select: { id: true, name: true, color: true },
          });
    const categoryById = new Map(categories.map((category) => [category.id, category]));

    return rows.map((row) => {
      const category = row.categoryId === null ? undefined : categoryById.get(row.categoryId);
      return {
        id: row.id,
        type: row.type,
        amountMinor: toContractString(row.amountMinor),
        currency: row.currency,
        occurredAt: row.occurredAt.toISOString(),
        adjustmentSign: row.adjustmentSign === 1 ? 1 : row.adjustmentSign === -1 ? -1 : null,
        note: row.note,
        categoryName: category?.name ?? null,
        categoryColor: category?.color ?? null,
      };
    });
  }
}

interface RawPeriodAggregateRow {
  readonly localDate: string;
  readonly type: string;
  readonly total: string;
  readonly count: number;
}

interface ActiveBalanceSnapshot {
  readonly totalMinor: bigint;
  readonly accountCount: number;
}

interface PeriodAggregates {
  readonly days: DayTotals[];
  readonly incomeMinor: bigint;
  readonly expenseMinor: bigint;
  readonly transactionCount: number;
}

interface CategorySpending {
  readonly totalExpenseMinor: bigint;
  readonly categories: CategorySpendSummary[];
}

function toPeriodResponse(period: ResolvedSummaryPeriod): SummaryPeriod {
  return {
    dateFrom: period.dateFrom,
    dateTo: period.dateTo,
    timezone: period.timezone,
    currency: DEFAULT_CURRENCY_CODE,
  };
}

function toTotals(aggregates: PeriodAggregates): SummaryTotals {
  return {
    incomeMinor: toContractString(aggregates.incomeMinor),
    expenseMinor: toContractString(aggregates.expenseMinor),
    transactionCount: aggregates.transactionCount,
  };
}
