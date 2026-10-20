import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { GoalsService } from './goals.service';

/**
 * Goals service tests with a mocked database (IT-10, ADR-0005): ownership
 * scoping, derived progress from the ledger, overfunding, lifecycle
 * transitions, and reversal safety. Real PostgreSQL behavior (CHECKs, the
 * UNIQUE reversal index, cascade delete, and the "no account/budget effect"
 * invariant) is covered by `test/integration/goals.test.ts`.
 */

const USER_ID = 'user-1';
const GOAL_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CONTRIBUTION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const REVERSAL_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const START = new Date('2026-10-01T00:00:00.000Z');

function goalRow(overrides: Record<string, unknown> = {}) {
  return {
    id: GOAL_ID,
    userId: USER_ID,
    name: 'Emergency fund',
    type: 'EMERGENCY_FUND',
    targetMinor: 3_000_000n,
    currency: 'BDT',
    startDate: START,
    deadline: null,
    priority: 'MEDIUM',
    status: 'ACTIVE',
    createdAt: START,
    updatedAt: START,
    ...overrides,
  };
}

function contributionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTRIBUTION_ID,
    userId: USER_ID,
    goalId: GOAL_ID,
    amountMinor: 800_000n,
    occurredAt: START,
    note: null,
    reversesContributionId: null,
    createdAt: START,
    reversedBy: null,
    ...overrides,
  };
}

function mockDb() {
  const tx = {
    $queryRaw: vi.fn(),
    goalContribution: { findFirst: vi.fn(), create: vi.fn() },
  };
  const top = {
    goal: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    goalContribution: { findMany: vi.fn(), create: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn((argument: unknown) =>
      typeof argument === 'function'
        ? (argument as (client: unknown) => unknown)(tx)
        : Promise.all(argument as Array<Promise<unknown>>),
    ),
  };
  return { prisma: top as unknown as PrismaService, tx, top };
}

describe('GoalsService', () => {
  describe('createGoal', () => {
    it('creates a goal with defaults and reports zero progress', async () => {
      const { prisma, top } = mockDb();
      top.goal.create.mockResolvedValue(goalRow({ type: 'GENERAL', priority: 'MEDIUM' }));

      const result = await new GoalsService(prisma).createGoal(USER_ID, {
        name: 'Laptop',
        target: '48000',
        startDate: '2026-10-05',
      });

      expect(top.goal.create).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          name: 'Laptop',
          type: 'GENERAL',
          targetMinor: 4_800_000n,
          currency: 'BDT',
          startDate: new Date('2026-10-05T00:00:00.000Z'),
          deadline: null,
          priority: 'MEDIUM',
        },
      });
      expect(result.figures).toEqual({
        savedMinor: '0',
        remainingMinor: '3000000',
        percentTimes10: '0',
        overfunded: false,
      });
    });

    it('rejects a deadline before the start date before touching the database', async () => {
      const { prisma, top } = mockDb();
      await expect(
        new GoalsService(prisma).createGoal(USER_ID, {
          name: 'Goal',
          target: '100',
          startDate: '2026-10-10',
          deadline: '2026-10-09',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(top.goal.create).not.toHaveBeenCalled();
    });
  });

  describe('listGoals', () => {
    it('scopes to the caller, hides archived goals by default, and derives exact progress', async () => {
      const { prisma, top } = mockDb();
      top.goal.findMany.mockResolvedValue([
        goalRow({ targetMinor: 3_000_000n }),
        goalRow({ id: 'other-goal', targetMinor: 1_000_000n, status: 'PAUSED' }),
      ]);
      top.$queryRaw.mockResolvedValue([
        { goalId: GOAL_ID, total: '3600000' }, // 120% of target
        { goalId: 'other-goal', total: '250000' },
      ]);

      const [overfunded, partial] = await new GoalsService(prisma).listGoals(USER_ID, {
        includeArchived: 'false',
      });

      expect(top.goal.findMany.mock.calls[0]?.[0]).toMatchObject({
        where: { userId: USER_ID, status: { not: 'ARCHIVED' } },
      });
      expect(overfunded?.figures).toEqual({
        savedMinor: '3600000',
        remainingMinor: '-600000',
        percentTimes10: '1200',
        overfunded: true,
      });
      expect(partial?.figures).toEqual({
        savedMinor: '250000',
        remainingMinor: '750000',
        percentTimes10: '250',
        overfunded: false,
      });
    });

    it('includes archived goals when asked and defaults missing ledger sums to zero', async () => {
      const { prisma, top } = mockDb();
      top.goal.findMany.mockResolvedValue([goalRow({ status: 'ARCHIVED' })]);
      top.$queryRaw.mockResolvedValue([]);

      const [goal] = await new GoalsService(prisma).listGoals(USER_ID, {
        includeArchived: 'true',
      });

      expect(top.goal.findMany.mock.calls[0]?.[0]).toMatchObject({ where: { userId: USER_ID } });
      expect(goal?.status).toBe('ARCHIVED');
      expect(goal?.figures.savedMinor).toBe('0');
    });

    it('keeps values exact beyond Number.MAX_SAFE_INTEGER', async () => {
      const { prisma, top } = mockDb();
      top.goal.findMany.mockResolvedValue([goalRow({ targetMinor: 9_007_199_254_740_993n })]);
      top.$queryRaw.mockResolvedValue([{ goalId: GOAL_ID, total: '9007199254740993000' }]);

      const [goal] = await new GoalsService(prisma).listGoals(USER_ID, {});

      expect(goal?.figures.savedMinor).toBe('9007199254740993000');
      expect(goal?.figures.remainingMinor).toBe('-8998192055486252007');
      expect(goal?.figures.overfunded).toBe(true);
    });
  });

  describe('getGoal', () => {
    it('returns a non-revealing 404 for a foreign or unknown goal', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(null);

      await expect(new GoalsService(prisma).getGoal(USER_ID, GOAL_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(top.goal.findFirst).toHaveBeenCalledWith({ where: { id: GOAL_ID, userId: USER_ID } });
    });

    it('rejects malformed ids as not found without querying', async () => {
      const { prisma, top } = mockDb();
      await expect(new GoalsService(prisma).getGoal(USER_ID, 'not-a-uuid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(top.goal.findFirst).not.toHaveBeenCalled();
    });

    it('returns the ledger history newest first with reversal links', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      top.$queryRaw.mockResolvedValue([{ total: '0' }]);
      top.goalContribution.findMany.mockResolvedValue([
        contributionRow({
          id: REVERSAL_ID,
          amountMinor: -800_000n,
          reversesContributionId: CONTRIBUTION_ID,
        }),
        contributionRow({ reversedBy: { id: REVERSAL_ID } }),
      ]);

      const detail = await new GoalsService(prisma).getGoal(USER_ID, GOAL_ID);

      expect(top.goalContribution.findMany.mock.calls[0]?.[0]).toMatchObject({
        where: { userId: USER_ID, goalId: GOAL_ID },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      });
      expect(detail.figures.savedMinor).toBe('0');
      expect(detail.contributions).toHaveLength(2);
      expect(detail.contributions[0]).toMatchObject({
        amountMinor: '-800000',
        reversesContributionId: CONTRIBUTION_ID,
        reversedByContributionId: null,
      });
      expect(detail.contributions[1]).toMatchObject({
        reversedByContributionId: REVERSAL_ID,
        reversesContributionId: null,
      });
    });
  });

  describe('updateGoal', () => {
    it('validates a supplied deadline against the stored start date', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow({ startDate: START }));

      await expect(
        new GoalsService(prisma).updateGoal(USER_ID, GOAL_ID, { deadline: '2026-09-30' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(top.goal.update).not.toHaveBeenCalled();
    });

    it('clears the deadline and re-derives progress from the ledger', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow({ deadline: START }));
      top.goal.update.mockResolvedValue(goalRow({ deadline: null }));
      top.$queryRaw.mockResolvedValue([{ total: '800000' }]);

      const result = await new GoalsService(prisma).updateGoal(USER_ID, GOAL_ID, {
        deadline: null,
      });

      expect(top.goal.update).toHaveBeenCalledWith({
        where: { id: GOAL_ID },
        data: { deadline: null },
      });
      expect(result.deadline).toBeNull();
      expect(result.figures.savedMinor).toBe('800000');
    });
  });

  describe('deleteGoal', () => {
    it('hard-deletes only the caller’s goal (ledger rows cascade in the schema)', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());

      await new GoalsService(prisma).deleteGoal(USER_ID, GOAL_ID);

      expect(top.goal.delete).toHaveBeenCalledWith({ where: { id: GOAL_ID } });
    });

    it('404s for a goal the caller does not own', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(null);

      await expect(new GoalsService(prisma).deleteGoal(USER_ID, GOAL_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(top.goal.delete).not.toHaveBeenCalled();
    });
  });

  describe('lifecycle transitions', () => {
    it('pauses an active goal and returns the updated status', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      top.goal.update.mockResolvedValue(goalRow({ status: 'PAUSED' }));
      top.$queryRaw.mockResolvedValue([{ total: '0' }]);

      const result = await new GoalsService(prisma).pauseGoal(USER_ID, GOAL_ID);

      expect(top.goal.update).toHaveBeenCalledWith({
        where: { id: GOAL_ID },
        data: { status: 'PAUSED' },
      });
      expect(result.status).toBe('PAUSED');
    });

    it('is idempotent when the goal already has the target status', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow({ status: 'PAUSED' }));
      top.$queryRaw.mockResolvedValue([{ total: '0' }]);

      const result = await new GoalsService(prisma).pauseGoal(USER_ID, GOAL_ID);

      expect(top.goal.update).not.toHaveBeenCalled();
      expect(result.status).toBe('PAUSED');
    });

    it('rejects lifecycle moves that are not allowed from the current status', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow({ status: 'COMPLETED' }));

      await expect(new GoalsService(prisma).pauseGoal(USER_ID, GOAL_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );

      top.goal.findFirst.mockResolvedValue(goalRow({ status: 'ARCHIVED' }));
      await expect(new GoalsService(prisma).completeGoal(USER_ID, GOAL_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );

      top.goal.findFirst.mockResolvedValue(goalRow({ status: 'PAUSED' }));
      await expect(new GoalsService(prisma).unarchiveGoal(USER_ID, GOAL_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(top.goal.update).not.toHaveBeenCalled();
    });

    it('completes a paused goal and archives a completed one', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow({ status: 'PAUSED' }));
      top.goal.update.mockResolvedValue(goalRow({ status: 'COMPLETED' }));
      top.$queryRaw.mockResolvedValue([{ total: '0' }]);

      const completed = await new GoalsService(prisma).completeGoal(USER_ID, GOAL_ID);
      expect(completed.status).toBe('COMPLETED');

      top.goal.findFirst.mockResolvedValue(goalRow({ status: 'COMPLETED' }));
      top.goal.update.mockResolvedValue(goalRow({ status: 'ARCHIVED' }));
      const archived = await new GoalsService(prisma).archiveGoal(USER_ID, GOAL_ID);
      expect(archived.status).toBe('ARCHIVED');
    });
  });

  describe('addContribution', () => {
    it('appends a positive ledger row without touching any other table', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      top.goalContribution.create.mockResolvedValue(contributionRow({ note: 'leftover' }));

      const result = await new GoalsService(prisma).addContribution(USER_ID, GOAL_ID, {
        amount: '8000',
        occurredDate: '2026-10-19',
        note: 'leftover',
      });

      expect(top.goalContribution.create.mock.calls[0]?.[0]).toMatchObject({
        data: {
          userId: USER_ID,
          goalId: GOAL_ID,
          amountMinor: 800_000n,
          occurredAt: new Date('2026-10-18T18:00:00.000Z'), // 2026-10-19 00:00 Asia/Dhaka
          note: 'leftover',
        },
      });
      expect(result.amountMinor).toBe('800000');
      expect(result.reversesContributionId).toBeNull();
    });

    it('refuses contributions to a goal that is not active', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow({ status: 'PAUSED' }));

      await expect(
        new GoalsService(prisma).addContribution(USER_ID, GOAL_ID, { amount: '100' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(top.goalContribution.create).not.toHaveBeenCalled();
    });

    it('rejects a future occurredDate', async () => {
      const { prisma, top } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      const farFuture = `${new Date().getUTCFullYear() + 2}-01-01`;

      await expect(
        new GoalsService(prisma).addContribution(USER_ID, GOAL_ID, {
          amount: '100',
          occurredDate: farFuture,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(top.goalContribution.create).not.toHaveBeenCalled();
    });
  });

  describe('reverseContribution', () => {
    it('appends a linked negative reversal inside a locked transaction', async () => {
      const { prisma, top, tx } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      tx.$queryRaw.mockResolvedValue([{ id: GOAL_ID }]);
      tx.goalContribution.findFirst
        .mockResolvedValueOnce(contributionRow()) // the original
        .mockResolvedValueOnce(null); // no existing reversal
      tx.goalContribution.create.mockResolvedValue(
        contributionRow({
          id: REVERSAL_ID,
          amountMinor: -800_000n,
          reversesContributionId: CONTRIBUTION_ID,
        }),
      );

      const result = await new GoalsService(prisma).reverseContribution(
        USER_ID,
        GOAL_ID,
        CONTRIBUTION_ID,
      );

      expect(tx.goalContribution.create.mock.calls[0]?.[0]).toMatchObject({
        data: {
          userId: USER_ID,
          goalId: GOAL_ID,
          amountMinor: -800_000n,
          reversesContributionId: CONTRIBUTION_ID,
        },
      });
      expect(result.amountMinor).toBe('-800000');
      expect(result.reversesContributionId).toBe(CONTRIBUTION_ID);
    });

    it('rejects reversing a reversal', async () => {
      const { prisma, top, tx } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      tx.$queryRaw.mockResolvedValue([{ id: GOAL_ID }]);
      tx.goalContribution.findFirst.mockResolvedValueOnce(
        contributionRow({
          id: REVERSAL_ID,
          amountMinor: -800_000n,
          reversesContributionId: CONTRIBUTION_ID,
        }),
      );

      await expect(
        new GoalsService(prisma).reverseContribution(USER_ID, GOAL_ID, REVERSAL_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.goalContribution.create).not.toHaveBeenCalled();
    });

    it('rejects a second reversal of the same contribution', async () => {
      const { prisma, top, tx } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      tx.$queryRaw.mockResolvedValue([{ id: GOAL_ID }]);
      tx.goalContribution.findFirst
        .mockResolvedValueOnce(contributionRow())
        .mockResolvedValueOnce({ id: REVERSAL_ID });

      await expect(
        new GoalsService(prisma).reverseContribution(USER_ID, GOAL_ID, CONTRIBUTION_ID),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(tx.goalContribution.create).not.toHaveBeenCalled();
    });

    it('maps a concurrent UNIQUE violation to 409 instead of 500', async () => {
      const { prisma, top, tx } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      tx.$queryRaw.mockResolvedValue([{ id: GOAL_ID }]);
      tx.goalContribution.findFirst
        .mockResolvedValueOnce(contributionRow())
        .mockResolvedValueOnce(null);
      tx.goalContribution.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          'Unique constraint failed on the fields: (`reversesContributionId`)',
          {
            code: 'P2002',
            clientVersion: '7.10.1',
            meta: { target: ['reversesContributionId'] },
          },
        ),
      );

      await expect(
        new GoalsService(prisma).reverseContribution(USER_ID, GOAL_ID, CONTRIBUTION_ID),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('404s when the contribution is not part of the caller’s goal', async () => {
      const { prisma, top, tx } = mockDb();
      top.goal.findFirst.mockResolvedValue(goalRow());
      tx.$queryRaw.mockResolvedValue([{ id: GOAL_ID }]);
      tx.goalContribution.findFirst.mockResolvedValueOnce(null);

      await expect(
        new GoalsService(prisma).reverseContribution(USER_ID, GOAL_ID, CONTRIBUTION_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(tx.goalContribution.create).not.toHaveBeenCalled();
    });
  });
});
