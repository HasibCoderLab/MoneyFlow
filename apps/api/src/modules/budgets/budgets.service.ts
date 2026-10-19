import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BudgetCategoryLimitResponse,
  BudgetFigures,
  BudgetResponse,
  BudgetStatus,
} from '@moneyflow/contracts';

import { toContractString } from '../../domain/money/amount';
import { percentTimes10 } from '../../domain/money/percentage';
import { DEFAULT_CURRENCY_CODE } from '../../domain/money/currency';
import { assertUuid, mapMoneyError } from '../../common/http-errors';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_TIMEZONE, startOfLocalDay } from '../transactions/occurrence';
import { addLocalMonths } from '../summary/summary-periods';
import {
  parseCreateBudgetInput,
  parseListBudgetsQuery,
  parseUpdateBudgetInput,
  type ParsedCategoryLimit,
} from './dto';

/**
 * Budgets domain service (IT-9, requirements.md §5.9/§9.4, domain-model.md
 * "Budget and BudgetCategoryLimit", accounting-rules.md §1.1/§6/§7/§9).
 *
 * Rules enforced here (all deterministic):
 * - every query is scoped to the session-derived `userId`; foreign and
 *   malformed ids are both 404 and never distinguish existence;
 * - a budget is a monthly plan anchored at the first day of a month; the
 *   period is that month's half-open local-day boundaries in the user's
 *   timezone (default `Asia/Dhaka` until IT-11), the same boundary helper
 *   the summary service uses;
 * - "spent" counts qualifying `EXPENSE` transactions in the period with an
 *   explicit type filter — transfers, income, and adjustments never count,
 *   and a future `REFUND` type stays excluded until it is handled
 *   deliberately (accounting-rules.md §1.1, IT-8 precedent);
 * - sums are exact `bigint` computed by the database with `SUM(...)::text`,
 *   never JSON numbers (ADR-0003); remaining amounts are never clamped, so
 *   overspend shows truthfully as a negative remainder;
 * - one ACTIVE budget limit per category per month (domain-model.md,
 *   service-layer rule): create, update, resume, and unarchive re-check it;
 * - limits reference the caller's ACTIVE `EXPENSE` categories only —
 *   archived, income, foreign, and malformed categories are rejected, never
 *   silently accepted.
 *
 * Single-row writes run inside database transactions (§4.1); money parses
 * through the shared strict grammar and maps to 400 (ADR-0003).
 */
@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /api/v1/budgets` — the caller's budgets with current utilization. */
  public async listBudgets(userId: string, query: unknown): Promise<BudgetResponse[]> {
    const { includeArchived } = parseListBudgetsQuery(query);
    const budgets = await this.prisma.budget.findMany({
      where: { userId, ...(includeArchived ? {} : { status: { in: ['ACTIVE', 'PAUSED'] } }) },
      include: { categoryLimits: { include: { category: true } } },
      orderBy: [{ startDate: 'desc' }, { id: 'asc' }],
    });
    return this.withUtilization(userId, budgets);
  }

  /** `POST /api/v1/budgets` — creates a monthly budget with its limits. */
  public async createBudget(userId: string, body: unknown): Promise<BudgetResponse> {
    const input = parseCreateBudgetInput(body);
    await this.resolveExpenseCategories(userId, input.categoryLimits);
    await this.assertNotOverlapping(userId, input.startDate, input.categoryLimits, null);

    try {
      const budget = await this.prisma.$transaction(async (tx) => {
        const created = await tx.budget.create({
          data: {
            userId,
            name: input.name,
            startDate: toDateOnly(input.startDate),
            totalLimitMinor: input.totalLimitMinor,
          },
        });
        await tx.budgetCategoryLimit.createMany({
          data: input.categoryLimits.map((limit) => ({
            budgetId: created.id,
            categoryId: limit.categoryId,
            limitMinor: limit.limitMinor,
          })),
        });
        return created;
      });

      const loaded = await this.prisma.budget.findFirstOrThrow({
        where: { id: budget.id },
        include: { categoryLimits: { include: { category: true } } },
      });
      const [result] = await this.withUtilization(userId, [loaded]);
      return result as BudgetResponse;
    } catch (error) {
      throw mapMoneyError(error);
    }
  }

  /** `PATCH /api/v1/budgets/:id` — renames, re-anchors, and replaces limits. */
  public async updateBudget(userId: string, rawId: string, body: unknown): Promise<BudgetResponse> {
    const id = assertUuid(rawId, 'Budget');
    const input = parseUpdateBudgetInput(body);

    const current = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { categoryLimits: true },
    });
    if (!current) {
      throw new NotFoundException('Budget not found.');
    }

    const nextStart = input.startDate ?? monthStartText(current.startDate);
    const nextLimits = input.categoryLimits;
    const mergedCategoryIds = (
      nextLimits ?? current.categoryLimits.map((l) => ({ categoryId: l.categoryId }))
    ).map((limit) => limit.categoryId);
    if (nextLimits !== undefined) {
      await this.resolveExpenseCategories(userId, nextLimits);
    }
    // A paused or archived budget being edited does not hold the
    // one-active-limit-per-category rule; only budgets that are (or become)
    // ACTIVE are checked (domain-model.md).
    if (
      current.status === 'ACTIVE' &&
      (nextLimits !== undefined || input.startDate !== undefined)
    ) {
      await this.assertNotOverlapping(userId, nextStart, undefined, id, mergedCategoryIds);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        if (
          input.name !== undefined ||
          input.startDate !== undefined ||
          input.totalLimitMinor !== undefined
        ) {
          await tx.budget.update({
            where: { id },
            data: {
              ...(input.name !== undefined ? { name: input.name } : {}),
              ...(input.startDate !== undefined ? { startDate: toDateOnly(input.startDate) } : {}),
              ...(input.totalLimitMinor !== undefined
                ? { totalLimitMinor: input.totalLimitMinor }
                : {}),
            },
          });
        }
        if (nextLimits !== undefined) {
          const keepIds = new Set(nextLimits.map((limit) => limit.categoryId));
          await tx.budgetCategoryLimit.deleteMany({
            where: { budgetId: id, categoryId: { notIn: [...keepIds] } },
          });
          for (const limit of nextLimits) {
            await tx.budgetCategoryLimit.upsert({
              where: { budgetId_categoryId: { budgetId: id, categoryId: limit.categoryId } },
              create: {
                budgetId: id,
                categoryId: limit.categoryId,
                limitMinor: limit.limitMinor,
              },
              update: { limitMinor: limit.limitMinor },
            });
          }
        }
      });
    } catch (error) {
      throw mapMoneyError(error);
    }

    const updated = await this.prisma.budget.findFirstOrThrow({
      where: { id },
      include: { categoryLimits: { include: { category: true } } },
    });
    const [result] = await this.withUtilization(userId, [updated]);
    return result as BudgetResponse;
  }

  /** `DELETE /api/v1/budgets/:id` — hard delete; limits cascade (domain-model.md). */
  public async deleteBudget(userId: string, rawId: string): Promise<void> {
    const id = assertUuid(rawId, 'Budget');
    const current = await this.prisma.budget.findFirst({ where: { id, userId } });
    if (!current) {
      throw new NotFoundException('Budget not found.');
    }
    await this.prisma.budget.delete({ where: { id } });
  }

  /** `POST /api/v1/budgets/:id/archive` — any status → ARCHIVED (idempotent). */
  public archiveBudget(userId: string, rawId: string): Promise<BudgetResponse> {
    return this.transition(userId, rawId, 'ARCHIVED');
  }

  /** `POST /api/v1/budgets/:id/unarchive` — ARCHIVED → ACTIVE (overlap-checked). */
  public unarchiveBudget(userId: string, rawId: string): Promise<BudgetResponse> {
    return this.transition(userId, rawId, 'ACTIVE', { from: ['ARCHIVED', 'ACTIVE'] });
  }

  /** `POST /api/v1/budgets/:id/pause` — ACTIVE → PAUSED (idempotent on PAUSED). */
  public pauseBudget(userId: string, rawId: string): Promise<BudgetResponse> {
    return this.transition(userId, rawId, 'PAUSED', { from: ['ACTIVE', 'PAUSED'] });
  }

  /** `POST /api/v1/budgets/:id/resume` — PAUSED → ACTIVE (overlap-checked). */
  public resumeBudget(userId: string, rawId: string): Promise<BudgetResponse> {
    return this.transition(userId, rawId, 'ACTIVE', { from: ['PAUSED', 'ACTIVE'] });
  }

  private async transition(
    userId: string,
    rawId: string,
    status: BudgetStatus,
    options: { from?: BudgetStatus[] } = {},
  ): Promise<BudgetResponse> {
    const id = assertUuid(rawId, 'Budget');
    const current = await this.prisma.budget.findFirst({
      where: { id, userId },
      include: { categoryLimits: true },
    });
    if (!current) {
      throw new NotFoundException('Budget not found.');
    }
    if (options.from && !options.from.includes(current.status)) {
      throw new ConflictException(
        `A ${current.status.toLowerCase()} budget cannot move directly to ${status.toLowerCase()}.`,
      );
    }
    if (status === 'ACTIVE' && current.status !== 'ACTIVE') {
      // Becoming active re-asserts the one-active-limit-per-category rule.
      await this.assertNotOverlapping(
        userId,
        monthStartText(current.startDate),
        undefined,
        id,
        current.categoryLimits.map((limit) => limit.categoryId),
      );
    }
    if (current.status === status) {
      const unchanged = await this.prisma.budget.findFirstOrThrow({
        where: { id },
        include: { categoryLimits: { include: { category: true } } },
      });
      const [result] = await this.withUtilization(userId, [unchanged]);
      return result as BudgetResponse;
    }
    await this.prisma.budget.update({ where: { id }, data: { status } });
    const updated = await this.prisma.budget.findFirstOrThrow({
      where: { id },
      include: { categoryLimits: { include: { category: true } } },
    });
    const [result] = await this.withUtilization(userId, [updated]);
    return result as BudgetResponse;
  }

  /**
   * Validates that every limit targets one of the caller's ACTIVE `EXPENSE`
   * categories. Archived, income, foreign, and malformed ids are rejected
   * with one safe 400 that never reveals whether a foreign id exists.
   */
  private async resolveExpenseCategories(
    userId: string,
    limits: readonly ParsedCategoryLimit[],
  ): Promise<void> {
    const ids = limits.map((limit) => limit.categoryId);
    for (const id of ids) {
      if (!isUuid(id)) {
        throw new BadRequestException(
          'Every category limit must reference one of your active expense categories.',
        );
      }
    }
    const categories = await this.prisma.category.findMany({
      where: { userId, id: { in: ids } },
      select: { id: true, name: true, color: true, type: true, status: true },
    });
    const byId = new Map(categories.map((category) => [category.id, category]));
    for (const id of ids) {
      const category = byId.get(id);
      if (!category || !isUuid(id)) {
        throw new BadRequestException(
          'Every category limit must reference one of your active expense categories.',
        );
      }
      if (category.type !== 'EXPENSE') {
        throw new BadRequestException(`Category "${category.name}" is not an expense category.`);
      }
      if (category.status !== 'ACTIVE') {
        throw new BadRequestException(
          `Category "${category.name}" is archived; unarchive it before budgeting against it.`,
        );
      }
    }
  }

  /** Domain rule: one ACTIVE budget limit per category per month. */
  private async assertNotOverlapping(
    userId: string,
    monthStart: string,
    limits: readonly ParsedCategoryLimit[] | undefined,
    excludeBudgetId: string | null,
    categoryIdsOverride?: string[],
  ): Promise<void> {
    const categoryIds = categoryIdsOverride ?? (limits ?? []).map((limit) => limit.categoryId);
    if (categoryIds.length === 0) {
      return;
    }
    const conflict = await this.prisma.budget.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        startDate: toDateOnly(monthStart),
        ...(excludeBudgetId ? { id: { not: excludeBudgetId } } : {}),
        categoryLimits: { some: { categoryId: { in: categoryIds } } },
      },
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException(
        'Another active budget already limits one of these categories for this month.',
      );
    }
  }

  /**
   * Attaches current-period utilization to each budget. Spending is
   * aggregated by the database per distinct month in one grouped query per
   * month (exact `::text` sums), so the cost stays flat regardless of budget
   * count.
   */
  private async withUtilization(
    userId: string,
    budgets: readonly (BudgetRow & { categoryLimits: LimitRow[] })[],
  ): Promise<BudgetResponse[]> {
    const timezone = DEFAULT_TIMEZONE;
    const spentByBudget = new Map<string, Map<string, bigint>>();
    const totalSpentByBudget = new Map<string, bigint>();

    const months = [...new Set(budgets.map((budget) => monthStartText(budget.startDate)))];
    for (const month of months) {
      const monthBudgets = budgets.filter((budget) => monthStartText(budget.startDate) === month);
      const fromInstant = startOfLocalDay(timezone, month);
      const toInstant = startOfLocalDay(timezone, nextMonthStart(month));
      const categoryIds = [
        ...new Set(
          monthBudgets.flatMap((budget) => budget.categoryLimits.map((limit) => limit.categoryId)),
        ),
      ];

      if (categoryIds.length > 0) {
        // One grouped aggregation for the whole month (same portable shape
        // as the IT-8 summary service); each budget then reads only its own
        // categories from the totals map, so no per-budget query is needed.
        const rows = await this.prisma.$queryRaw<
          { categoryId: string | null; total: string | null }[]
        >`
          SELECT "categoryId", SUM("amountMinor")::text AS "total"
          FROM "transaction"
          WHERE "userId" = ${userId}
            AND "type" = 'EXPENSE'
            AND "occurredAt" >= ${fromInstant}
            AND "occurredAt" < ${toInstant}
          GROUP BY "categoryId"
        `;
        // Unreachable in practice (EXPENSE requires a category per the CHECK
        // constraint); skipped defensively, never guessed — same rule as the
        // IT-8 summary service.
        const categoryTotals = new Map(
          rows
            .filter((row) => row.categoryId !== null && row.total !== null)
            .map((row) => [row.categoryId as string, BigInt(row.total as string)]),
        );
        for (const budget of monthBudgets) {
          const perCategory = new Map<string, bigint>();
          for (const limit of budget.categoryLimits) {
            perCategory.set(limit.categoryId, categoryTotals.get(limit.categoryId) ?? 0n);
          }
          spentByBudget.set(budget.id, perCategory);
        }
      }

      if (monthBudgets.some((budget) => budget.totalLimitMinor !== null)) {
        const rows = await this.prisma.$queryRaw<{ total: string | null }[]>`
          SELECT COALESCE(SUM("amountMinor"), 0)::text AS "total"
          FROM "transaction"
          WHERE "userId" = ${userId}
            AND "type" = 'EXPENSE'
            AND "occurredAt" >= ${fromInstant}
            AND "occurredAt" < ${toInstant}
        `;
        const total = BigInt(rows[0]?.total ?? '0');
        for (const budget of monthBudgets) {
          if (budget.totalLimitMinor !== null) {
            totalSpentByBudget.set(budget.id, total);
          }
        }
      }
    }

    return budgets.map((budget) =>
      toBudgetResponse(
        budget,
        spentByBudget.get(budget.id) ?? new Map(),
        totalSpentByBudget.get(budget.id),
      ),
    );
  }
}

function nextMonthStart(monthStart: string): string {
  return `${addLocalMonths(monthStart.slice(0, 7), 1)}-01`;
}

/** `YYYY-MM-01` text of a stored month anchor (the DATE column is UTC midnight). */
function monthStartText(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDateOnly(text: string): Date {
  return new Date(`${text}T00:00:00.000Z`);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

interface BudgetRow {
  id: string;
  name: string;
  period: 'MONTHLY';
  startDate: Date;
  totalLimitMinor: bigint | null;
  status: BudgetStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface LimitRow {
  id: string;
  categoryId: string;
  limitMinor: bigint;
  category: { name: string; color: string | null };
}

function figures(limitMinor: bigint, spentMinor: bigint): BudgetFigures {
  const percent = percentTimes10(spentMinor, limitMinor);
  return {
    limitMinor: toContractString(limitMinor),
    spentMinor: toContractString(spentMinor),
    remainingMinor: toContractString(limitMinor - spentMinor),
    percentTimes10: percent === null ? null : toContractString(percent),
  };
}

function toBudgetResponse(
  budget: BudgetRow & { categoryLimits: LimitRow[] },
  spentByCategory: Map<string, bigint>,
  totalSpent: bigint | undefined,
): BudgetResponse {
  const categoryLimits: BudgetCategoryLimitResponse[] = budget.categoryLimits
    .map((limit) => ({
      id: limit.id,
      categoryId: limit.categoryId,
      categoryName: limit.category.name,
      categoryColor: limit.category.color,
      figures: figures(limit.limitMinor, spentByCategory.get(limit.categoryId) ?? 0n),
    }))
    .sort((a, b) => {
      const left = BigInt(a.figures.limitMinor);
      const right = BigInt(b.figures.limitMinor);
      if (left !== right) {
        return left > right ? -1 : 1;
      }
      return a.categoryId < b.categoryId ? -1 : a.categoryId > b.categoryId ? 1 : 0;
    });
  return {
    id: budget.id,
    name: budget.name,
    period: budget.period,
    startDate: monthStartText(budget.startDate),
    status: budget.status,
    totalFigures:
      budget.totalLimitMinor === null ? null : figures(budget.totalLimitMinor, totalSpent ?? 0n),
    categoryLimits,
    currency: DEFAULT_CURRENCY_CODE,
    createdAt: budget.createdAt.toISOString(),
    updatedAt: budget.updatedAt.toISOString(),
  };
}
