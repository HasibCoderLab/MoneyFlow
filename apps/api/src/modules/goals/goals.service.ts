import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  GoalContributionResponse,
  GoalDetailResponse,
  GoalFigures,
  GoalPriority,
  GoalResponse,
  GoalStatus,
  GoalType,
} from '@moneyflow/contracts';

import { toContractString } from '../../domain/money/amount';
import { percentTimes10 } from '../../domain/money/percentage';
import { DEFAULT_CURRENCY_CODE } from '../../domain/money/currency';
import { assertUuid, isUniqueViolationFor } from '../../common/http-errors';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { DEFAULT_TIMEZONE, localDateString, startOfLocalDay } from '../transactions/occurrence';
import {
  assertDeadlineNotBeforeStart,
  parseCreateContributionInput,
  parseCreateGoalInput,
  parseListGoalsQuery,
  parseUpdateGoalInput,
} from './dto';

/**
 * Goals domain service (IT-10, ADR-0005, requirements.md §5.8,
 * domain-model.md "Goal and GoalContribution", accounting-rules.md §1/§9).
 *
 * Rules enforced here (all deterministic):
 * - every query is scoped to the session-derived `userId`; foreign and
 *   malformed ids are both 404 and never distinguish existence;
 * - goal progress is `Σ GoalContribution.amountMinor` — contributions
 *   positive, reversal rows negative. Nothing is cached or stored as a
 *   balance, so edits can never drift;
 * - ledger rows never touch accounts, income, expenses, or budgets: this
 *   service does not read or write those tables at all, and the invariant is
 *   proven by integration tests (§12.1/§12.2);
 * - original contributions are immutable. Removing one creates a linked
 *   negative reversal (`reversesContributionId`); the UNIQUE index on that
 *   column is the final guard against a concurrent second reversal, and the
 *   service rejects reversing a reversal inside the same transaction that
 *   creates it;
 * - overfunding is allowed: `remainingMinor` is never clamped and the
 *   percentage is computed from exact minor units, so 120% shows as 120%;
 * - lifecycle moves are explicit: pause/resume/complete/archive/unarchive.
 *   Only ACTIVE goals accept new contributions; reversals stay possible so a
 *   mistaken entry can always be corrected without editing history;
 * - money parses through the shared strict grammar (ADR-0003) and every
 *   response value is a minor-unit integer string.
 */
@Injectable()
export class GoalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** `GET /api/v1/goals` — the caller's goals with derived progress. */
  public async listGoals(userId: string, query: unknown): Promise<GoalResponse[]> {
    const { includeArchived } = parseListGoalsQuery(query);
    const goals = await this.prisma.goal.findMany({
      where: { userId, ...(includeArchived ? {} : { status: { not: 'ARCHIVED' } }) },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }, { id: 'asc' }],
    });
    const savedByGoal = await this.savedByGoal(userId);
    return goals.map((goal) => toGoalResponse(goal, savedByGoal.get(goal.id) ?? 0n));
  }

  /** `POST /api/v1/goals` — creates a goal with no ledger rows yet. */
  public async createGoal(userId: string, body: unknown): Promise<GoalResponse> {
    const input = parseCreateGoalInput(body);
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
        targetMinor: input.targetMinor,
        currency: DEFAULT_CURRENCY_CODE,
        startDate: toDateOnly(input.startDate),
        deadline: input.deadline === null ? null : toDateOnly(input.deadline),
        priority: input.priority,
      },
    });
    return toGoalResponse(goal, 0n);
  }

  /** `GET /api/v1/goals/:id` — the goal plus its full ledger history. */
  public async getGoal(userId: string, rawId: string): Promise<GoalDetailResponse> {
    const id = assertUuid(rawId, 'Goal');
    const goal = await this.requireGoal(userId, id);
    const savedMinor = await this.savedForGoal(userId, id);
    const contributions = await this.prisma.goalContribution.findMany({
      where: { userId, goalId: id },
      include: { reversedBy: { select: { id: true } } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
    return {
      ...toGoalResponse(goal, savedMinor),
      contributions: contributions.map((row) => toContributionResponse(row)),
    };
  }

  /** `PATCH /api/v1/goals/:id` — edits plan fields; status has its own endpoints. */
  public async updateGoal(userId: string, rawId: string, body: unknown): Promise<GoalResponse> {
    const id = assertUuid(rawId, 'Goal');
    const current = await this.requireGoal(userId, id);
    const input = parseUpdateGoalInput(body);

    const nextStart = input.startDate ?? dateText(current.startDate);
    const nextDeadline =
      input.deadline === undefined
        ? current.deadline === null
          ? null
          : dateText(current.deadline)
        : input.deadline;
    assertDeadlineNotBeforeStart(nextStart, nextDeadline);

    const updated = await this.prisma.goal.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.targetMinor !== undefined ? { targetMinor: input.targetMinor } : {}),
        ...(input.startDate !== undefined ? { startDate: toDateOnly(input.startDate) } : {}),
        ...(input.deadline !== undefined
          ? { deadline: input.deadline === null ? null : toDateOnly(input.deadline) }
          : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
      },
    });
    const savedMinor = await this.savedForGoal(userId, id);
    return toGoalResponse(updated, savedMinor);
  }

  /** `DELETE /api/v1/goals/:id` — hard delete; ledger rows cascade. */
  public async deleteGoal(userId: string, rawId: string): Promise<void> {
    const id = assertUuid(rawId, 'Goal');
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.goal.findFirst({ where: { id, userId } });
      if (!current) {
        throw new NotFoundException('Goal not found.');
      }
      await tx.goal.delete({ where: { id } });
      await this.audit.recordInTransaction(tx, {
        userId,
        type: 'GOAL_DELETED',
        resourceType: 'goal',
        resourceId: id,
      });
    });
  }

  /** `POST /api/v1/goals/:id/pause` — ACTIVE → PAUSED (idempotent). */
  public pauseGoal(userId: string, rawId: string): Promise<GoalResponse> {
    return this.transition(userId, rawId, 'PAUSED', {
      from: ['ACTIVE', 'PAUSED'],
      allowedMessage: 'Only an active goal can be paused.',
    });
  }

  /** `POST /api/v1/goals/:id/resume` — PAUSED → ACTIVE (idempotent). */
  public resumeGoal(userId: string, rawId: string): Promise<GoalResponse> {
    return this.transition(userId, rawId, 'ACTIVE', {
      from: ['PAUSED', 'ACTIVE'],
      allowedMessage: 'Only a paused goal can be resumed.',
    });
  }

  /** `POST /api/v1/goals/:id/complete` — active/paused → COMPLETED (idempotent). */
  public completeGoal(userId: string, rawId: string): Promise<GoalResponse> {
    return this.transition(userId, rawId, 'COMPLETED', {
      from: ['ACTIVE', 'PAUSED', 'COMPLETED'],
      allowedMessage: 'An archived goal cannot be marked complete; unarchive it first.',
    });
  }

  /** `POST /api/v1/goals/:id/archive` — any status → ARCHIVED (idempotent). */
  public archiveGoal(userId: string, rawId: string): Promise<GoalResponse> {
    return this.transition(userId, rawId, 'ARCHIVED', {
      from: ['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'],
      allowedMessage: 'This goal cannot be archived.',
    });
  }

  /** `POST /api/v1/goals/:id/unarchive` — ARCHIVED → ACTIVE (idempotent). */
  public unarchiveGoal(userId: string, rawId: string): Promise<GoalResponse> {
    return this.transition(userId, rawId, 'ACTIVE', {
      from: ['ARCHIVED', 'ACTIVE'],
      allowedMessage: 'Only an archived goal can be unarchived.',
    });
  }

  /** `GET /api/v1/goals/:id/contributions` — the goal's ledger history. */
  public async listContributions(
    userId: string,
    rawId: string,
  ): Promise<GoalContributionResponse[]> {
    const goalId = assertUuid(rawId, 'Goal');
    await this.requireGoal(userId, goalId);
    const rows = await this.prisma.goalContribution.findMany({
      where: { userId, goalId },
      include: { reversedBy: { select: { id: true } } },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    });
    return rows.map((row) => toContributionResponse(row));
  }

  /**
   * `POST /api/v1/goals/:id/contributions` — records a contribution.
   * The goal must be ACTIVE, and a contribution may never be dated in the
   * future (same rule as transaction occurrences, ADR-0004 §7). Amounts are
   * strictly positive; removing a contribution is always a reversal.
   */
  public async addContribution(
    userId: string,
    rawId: string,
    body: unknown,
  ): Promise<GoalContributionResponse> {
    const goalId = assertUuid(rawId, 'Goal');
    const goal = await this.requireGoal(userId, goalId);
    if (goal.status !== 'ACTIVE') {
      throw new ConflictException(
        'Contributions can only be added to an active goal. Resume or unarchive it first.',
      );
    }
    const input = parseCreateContributionInput(body);
    const occurredAt = this.resolveOccurredAt(input.occurredDate);

    const created = await this.prisma.goalContribution.create({
      data: {
        userId,
        goalId,
        amountMinor: input.amountMinor,
        occurredAt,
        note: input.note,
      },
      include: { reversedBy: { select: { id: true } } },
    });
    return toContributionResponse(created);
  }

  /**
   * `POST /api/v1/goals/:id/contributions/:contributionId/reverse` —
   * appends a negative reversal linked to the original contribution.
   *
   * Concurrency: the goal row is locked for the duration of the transaction,
   * so two simultaneous reversal requests for the same contribution
   * serialize; the second sees the committed reversal (409) or loses the race
   * on the UNIQUE `reversesContributionId` index, which is mapped to 409
   * rather than a 500.
   */
  public async reverseContribution(
    userId: string,
    rawGoalId: string,
    rawContributionId: string,
  ): Promise<GoalContributionResponse> {
    const goalId = assertUuid(rawGoalId, 'Goal');
    const contributionId = assertUuid(rawContributionId, 'Contribution');
    await this.requireGoal(userId, goalId);

    let created: ContributionRow & { reversedBy: { id: string } | null };
    try {
      created = await this.prisma.$transaction(async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "goal"
          WHERE "id" = ${goalId} AND "userId" = ${userId}
          FOR UPDATE
        `;
        if (locked.length === 0) {
          throw new NotFoundException('Goal not found.');
        }
        const original = await tx.goalContribution.findFirst({
          where: { id: contributionId, goalId, userId },
        });
        if (!original) {
          throw new NotFoundException('Contribution not found.');
        }
        if (original.reversesContributionId !== null) {
          throw new ConflictException('A reversal cannot itself be reversed.');
        }
        const existing = await tx.goalContribution.findFirst({
          where: { reversesContributionId: original.id },
          select: { id: true },
        });
        if (existing) {
          throw new ConflictException('This contribution has already been reversed.');
        }
        return tx.goalContribution.create({
          data: {
            userId,
            goalId,
            amountMinor: -original.amountMinor,
            occurredAt: new Date(),
            reversesContributionId: original.id,
          },
          include: { reversedBy: { select: { id: true } } },
        });
      });
    } catch (error) {
      if (
        isUniqueViolationFor(error, 'goalContribution_reversesContributionId_key') ||
        isUniqueViolationFor(error, 'reversesContributionId')
      ) {
        throw new ConflictException('This contribution has already been reversed.');
      }
      throw error;
    }
    return toContributionResponse(created);
  }

  private async transition(
    userId: string,
    rawId: string,
    status: GoalStatus,
    options: { from: GoalStatus[]; allowedMessage: string },
  ): Promise<GoalResponse> {
    const id = assertUuid(rawId, 'Goal');
    const current = await this.requireGoal(userId, id);
    if (!options.from.includes(current.status)) {
      throw new ConflictException(options.allowedMessage);
    }
    const updated =
      current.status === status
        ? current
        : await this.prisma.goal.update({ where: { id }, data: { status } });
    const savedMinor = await this.savedForGoal(userId, id);
    return toGoalResponse(updated, savedMinor);
  }

  /** Loads a goal owned by `userId`; anything else is a non-revealing 404. */
  private async requireGoal(userId: string, id: string): Promise<GoalRow> {
    const goal = await this.prisma.goal.findFirst({ where: { id, userId } });
    if (!goal) {
      throw new NotFoundException('Goal not found.');
    }
    return goal;
  }

  /** Exact ledger sum for one goal, computed by the database as text. */
  private async savedForGoal(userId: string, goalId: string): Promise<bigint> {
    const rows = await this.prisma.$queryRaw<{ total: string | null }[]>`
      SELECT COALESCE(SUM("amountMinor"), 0)::text AS "total"
      FROM "goalContribution"
      WHERE "userId" = ${userId} AND "goalId" = ${goalId}
    `;
    return BigInt(rows[0]?.total ?? '0');
  }

  /** Exact ledger sums for every goal of the caller, in one grouped query. */
  private async savedByGoal(userId: string): Promise<Map<string, bigint>> {
    const rows = await this.prisma.$queryRaw<{ goalId: string; total: string | null }[]>`
      SELECT "goalId", SUM("amountMinor")::text AS "total"
      FROM "goalContribution"
      WHERE "userId" = ${userId}
      GROUP BY "goalId"
    `;
    return new Map(
      rows
        .filter((row) => row.total !== null)
        .map((row) => [row.goalId, BigInt(row.total as string)]),
    );
  }

  /**
   * Resolves the ledger timestamp: an explicit local date anchors at 00:00
   * local (the date is the meaningful unit for goals), and an omitted date
   * means "now". Future dates are rejected — a contribution records money
   * already set aside, never a plan (§5.4/§5.8).
   */
  private resolveOccurredAt(occurredDate: string | undefined): Date {
    if (occurredDate === undefined) {
      return new Date();
    }
    const today = localDateString(DEFAULT_TIMEZONE, new Date());
    if (occurredDate > today) {
      throw new BadRequestException('"occurredDate" must not be in the future.');
    }
    return startOfLocalDay(DEFAULT_TIMEZONE, occurredDate);
  }
}

function dateText(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function toDateOnly(text: string): Date {
  return new Date(`${text}T00:00:00.000Z`);
}

interface GoalRow {
  id: string;
  name: string;
  type: GoalType;
  targetMinor: bigint;
  currency: string;
  startDate: Date;
  deadline: Date | null;
  priority: GoalPriority;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface ContributionRow {
  id: string;
  goalId: string;
  amountMinor: bigint;
  occurredAt: Date;
  note: string | null;
  reversesContributionId: string | null;
  createdAt: Date;
  reversedBy?: { id: string } | null;
}

function toFigures(targetMinor: bigint, savedMinor: bigint): GoalFigures {
  const percent = percentTimes10(savedMinor, targetMinor);
  return {
    savedMinor: toContractString(savedMinor),
    remainingMinor: toContractString(targetMinor - savedMinor),
    percentTimes10: percent === null ? null : toContractString(percent),
    overfunded: savedMinor > targetMinor,
  };
}

function toGoalResponse(goal: GoalRow, savedMinor: bigint): GoalResponse {
  return {
    id: goal.id,
    name: goal.name,
    type: goal.type,
    currency: goal.currency,
    targetMinor: toContractString(goal.targetMinor),
    startDate: dateText(goal.startDate),
    deadline: goal.deadline === null ? null : dateText(goal.deadline),
    priority: goal.priority,
    status: goal.status,
    figures: toFigures(goal.targetMinor, savedMinor),
    createdAt: goal.createdAt.toISOString(),
    updatedAt: goal.updatedAt.toISOString(),
  };
}

function toContributionResponse(row: ContributionRow): GoalContributionResponse {
  return {
    id: row.id,
    goalId: row.goalId,
    amountMinor: toContractString(row.amountMinor),
    occurredAt: row.occurredAt.toISOString(),
    note: row.note,
    reversesContributionId: row.reversesContributionId,
    reversedByContributionId: row.reversedBy?.id ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}
