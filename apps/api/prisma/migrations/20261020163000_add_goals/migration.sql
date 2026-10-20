-- IT-10 goals and the virtual contribution ledger (ADR-0005,
-- requirements.md §5.8, domain-model.md). Additive only: two new tables and
-- three enums, no existing table is touched (IT-9 data is preserved).
--
-- Generated with `prisma migrate diff --from-schema <IT-9 schema> --to-schema
-- prisma/schema.prisma --script` (this machine has no PostgreSQL, so the
-- migration could not be authored with `migrate dev`); the CHECK constraints
-- below are hand-added, same convention as the IT-2 initial and IT-9 budget
-- migrations. Progress is never stored: it is Σ `amountMinor` on read.

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('GENERAL', 'EMERGENCY_FUND', 'EDUCATION', 'DEVICE', 'TRAVEL', 'DEBT_PAYOFF', 'CUSTOM');

-- CreateEnum
CREATE TYPE "GoalPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "goal" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "type" "GoalType" NOT NULL DEFAULT 'GENERAL',
    "targetMinor" BIGINT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "startDate" DATE NOT NULL,
    "deadline" DATE,
    "priority" "GoalPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "GoalStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goalContribution" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "goalId" UUID NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL,
    "note" VARCHAR(500),
    "reversesContributionId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goalContribution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goal_userId_status_idx" ON "goal"("userId", "status");

-- CreateIndex
CREATE INDEX "goal_userId_createdAt_idx" ON "goal"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "goalContribution_reversesContributionId_key" ON "goalContribution"("reversesContributionId");

-- CreateIndex
CREATE INDEX "goalContribution_userId_occurredAt_idx" ON "goalContribution"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "goalContribution_goalId_occurredAt_idx" ON "goalContribution"("goalId", "occurredAt" DESC);

-- AddForeignKey
ALTER TABLE "goal" ADD CONSTRAINT "goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalContribution" ADD CONSTRAINT "goalContribution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalContribution" ADD CONSTRAINT "goalContribution_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goalContribution" ADD CONSTRAINT "goalContribution_reversesContributionId_fkey" FOREIGN KEY ("reversesContributionId") REFERENCES "goalContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-added domain CHECKs (IT-2/IT-9 convention). The service validates the
-- same rules; the database is the final guard against direct writes.
--
-- - A goal target is strictly positive money (domain-model.md).
-- - A deadline never precedes the start date, when set.
-- - Ledger rows are signed by kind: a contribution is positive with no
--   linkage, a reversal is negative and must link to its original. This also
--   rejects zero-amount rows.
-- - A row can never reverse itself. "A reversal cannot itself be reversed"
--   is a cross-row rule that a CHECK cannot express; the service enforces it
--   inside the same transaction that creates the reversal, and the UNIQUE
--   index above rejects concurrent duplicate reversals.
ALTER TABLE "goal"
  ADD CONSTRAINT "goal_target_positive_check" CHECK ("targetMinor" > 0),
  ADD CONSTRAINT "goal_deadline_after_start_check" CHECK ("deadline" IS NULL OR "deadline" >= "startDate");

ALTER TABLE "goalContribution"
  ADD CONSTRAINT "goalContribution_amount_sign_check" CHECK (
    ("reversesContributionId" IS NULL AND "amountMinor" > 0)
    OR ("reversesContributionId" IS NOT NULL AND "amountMinor" < 0)
  ),
  ADD CONSTRAINT "goalContribution_no_self_reversal_check" CHECK (
    "reversesContributionId" IS NULL OR "reversesContributionId" <> "id"
  );
