-- IT-12 auditability (ADR-0011, DR-16). Additive only: one enum and one
-- table; no financial table is altered. `userId` uses ON DELETE SET NULL so
-- the event survives an account deletion without retaining an actor link.

-- CreateEnum
CREATE TYPE "AuditEventType" AS ENUM (
  'TRANSACTION_DELETED',
  'CATEGORY_DELETED',
  'BUDGET_DELETED',
  'GOAL_DELETED',
  'DATA_EXPORT_REQUESTED',
  'DATA_EXPORT_FAILED',
  'USER_ACCOUNT_DELETED'
);

-- CreateTable
CREATE TABLE "auditEvent" (
    "id" UUID NOT NULL,
    "userId" TEXT,
    "type" "AuditEventType" NOT NULL,
    "resourceType" VARCHAR(40),
    "resourceId" VARCHAR(64),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditEvent_userId_createdAt_idx" ON "auditEvent"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "auditEvent_type_createdAt_idx" ON "auditEvent"("type", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "auditEvent" ADD CONSTRAINT "auditEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Hand-added guard: metadata is always an object when present, so accidental
-- scalar/array payloads cannot be stored as audit metadata.
ALTER TABLE "auditEvent"
  ADD CONSTRAINT "auditEvent_metadata_object_check"
  CHECK ("metadata" IS NULL OR jsonb_typeof("metadata") = 'object');
