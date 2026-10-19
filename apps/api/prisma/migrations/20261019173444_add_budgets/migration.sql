-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY');

-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "budget" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "period" "BudgetPeriod" NOT NULL DEFAULT 'MONTHLY',
    "startDate" DATE NOT NULL,
    "totalLimitMinor" BIGINT,
    "status" "BudgetStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgetCategoryLimit" (
    "id" UUID NOT NULL,
    "budgetId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "limitMinor" BIGINT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "budgetCategoryLimit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_userId_status_idx" ON "budget"("userId", "status");

-- CreateIndex
CREATE INDEX "budget_userId_startDate_idx" ON "budget"("userId", "startDate");

-- CreateIndex
CREATE INDEX "budgetCategoryLimit_categoryId_idx" ON "budgetCategoryLimit"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "budgetCategoryLimit_budgetId_categoryId_key" ON "budgetCategoryLimit"("budgetId", "categoryId");

-- AddForeignKey
ALTER TABLE "budget" ADD CONSTRAINT "budget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgetCategoryLimit" ADD CONSTRAINT "budgetCategoryLimit_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgetCategoryLimit" ADD CONSTRAINT "budgetCategoryLimit_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- Hand-added domain CHECKs (same convention as the IT-2 initial
-- migration): budgets are monthly periods that start on the first day of a
-- month (accounting-rules.md §6), and every limit is strictly positive
-- (domain-model.md). The service validates these too; the database is the
-- final guard.
ALTER TABLE "budget"
  ADD CONSTRAINT "budget_start_date_first_of_month_check" CHECK (EXTRACT(DAY FROM "startDate") = 1),
  ADD CONSTRAINT "budget_total_limit_positive_check" CHECK ("totalLimitMinor" > 0);

ALTER TABLE "budgetCategoryLimit"
  ADD CONSTRAINT "budgetCategoryLimit_limit_positive_check" CHECK ("limitMinor" > 0);
