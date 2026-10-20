-- IT-11 preferences and dashboard customization (requirements.md §5.2/§5.7,
-- ADR-0010). Additive only: two new tables and six enums; no existing table is
-- altered, so all financial data (IT-2…IT-10) is preserved.
--
-- One row per user. A missing row is valid and yields documented defaults
-- without a write. `layout` is validated JSON written by the service, never
-- executable JSON. Currency remains explicit but BDT-only per DR-08.

-- CreateEnum
CREATE TYPE "UserLocale" AS ENUM ('EN', 'BN');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- CreateEnum
CREATE TYPE "WeekStartDay" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "DateFormatPreference" AS ENUM ('DMY', 'MDY', 'YMD');

-- CreateEnum
CREATE TYPE "NumberFormatPreference" AS ENUM ('LOCALE', 'LATIN', 'BENGALI');

-- CreateEnum
CREATE TYPE "ReducedMotionPreference" AS ENUM ('SYSTEM', 'REDUCE');

-- CreateTable
CREATE TABLE "userPreference" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "locale" "UserLocale" NOT NULL DEFAULT 'EN',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Dhaka',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'BDT',
    "theme" "ThemePreference" NOT NULL DEFAULT 'LIGHT',
    "weekStartsOn" "WeekStartDay" NOT NULL DEFAULT 'SATURDAY',
    "dateFormat" "DateFormatPreference" NOT NULL DEFAULT 'DMY',
    "numberFormat" "NumberFormatPreference" NOT NULL DEFAULT 'LOCALE',
    "reducedMotion" "ReducedMotionPreference" NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "userPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dashboardLayout" (
    "id" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "dashboardLayout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "userPreference_userId_key" ON "userPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "dashboardLayout_userId_key" ON "dashboardLayout"("userId");

-- AddForeignKey
ALTER TABLE "userPreference" ADD CONSTRAINT "userPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dashboardLayout" ADD CONSTRAINT "dashboardLayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-added guards (IT-2/IT-9/IT-10 convention). The service validates the
-- full shape; the database still rejects values that could never be valid.
ALTER TABLE "userPreference"
  ADD CONSTRAINT "userPreference_timezone_not_empty_check" CHECK (char_length(trim("timezone")) > 0),
  ADD CONSTRAINT "userPreference_currency_code_check" CHECK ("currency" ~ '^[A-Z]{3}$');

ALTER TABLE "dashboardLayout"
  ADD CONSTRAINT "dashboardLayout_layout_object_check" CHECK (jsonb_typeof("layout") = 'object');
