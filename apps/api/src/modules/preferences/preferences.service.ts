import { Injectable } from '@nestjs/common';
import type { UserPreferencesResponse } from '@moneyflow/contracts';

import { isUniqueViolationFor } from '../../common/http-errors';
import { PrismaService } from '../../prisma/prisma.service';
import {
  DEFAULT_PREFERENCES,
  parseUpdatePreferencesInput,
  type ParsedPreferencesUpdate,
} from './dto';

/** The subset of a persisted row this service maps to the public contract. */
interface PreferenceRow {
  locale: 'EN' | 'BN';
  timezone: string;
  currency: string;
  theme: 'LIGHT' | 'DARK' | 'SYSTEM';
  weekStartsOn: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
  dateFormat: 'DMY' | 'MDY' | 'YMD';
  numberFormat: 'LOCALE' | 'LATIN' | 'BENGALI';
  reducedMotion: 'SYSTEM' | 'REDUCE';
  updatedAt: Date;
}

/**
 * User preferences domain service (IT-11, requirements.md §5.2, ADR-0010).
 *
 * - Every read/write is scoped to the session-derived `userId`.
 * - A missing row is normal: documented defaults are returned without
 *   creating a row, so existing users and fresh sign-ups behave identically.
 * - Writes are partial: omitted fields keep their persisted value.
 * - These values are display/reporting preferences only. They never alter
 *   stored transactions, balances, budgets, goals, or totals; timezone and
 *   week-start are used only to choose reporting boundaries.
 * - Concurrent first writes are reconciled through the unique `userId`
 *   constraint and a retry update, so two tabs cannot cause a 500.
 */
@Injectable()
export class PreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  /** `GET /api/v1/preferences` — persisted values or documented defaults. */
  public async getPreferences(userId: string): Promise<UserPreferencesResponse> {
    const row = await this.prisma.userPreference.findUnique({ where: { userId } });
    return row ? toResponse(row) : { ...DEFAULT_PREFERENCES };
  }

  /**
   * Reporting preferences used by the summary/budget services. Never writes.
   * Kept separate from `getPreferences` so internal callers read the same
   * defaults without duplicating fallback logic.
   */
  public async getEffectivePreferences(userId: string): Promise<UserPreferencesResponse> {
    return this.getPreferences(userId);
  }

  /** `PATCH /api/v1/preferences` — upserts only the supplied fields. */
  public async updatePreferences(userId: string, body: unknown): Promise<UserPreferencesResponse> {
    const update = parseUpdatePreferencesInput(body);
    const data = toDatabaseUpdate(update);

    try {
      const row = await this.prisma.userPreference.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });
      return toResponse(row);
    } catch (error) {
      // A concurrent create can win the unique userId race between upsert's
      // lookup and insert. Retry as an update instead of surfacing a 500.
      if (!isUniqueViolationFor(error, 'userPreference_userId_key')) {
        throw error;
      }
      const row = await this.prisma.userPreference.update({
        where: { userId },
        data,
      });
      return toResponse(row);
    }
  }
}

/** Maps a persisted row to the public contract (locale is lowercase in JSON). */
export function toResponse(row: PreferenceRow): UserPreferencesResponse {
  return {
    locale: row.locale === 'BN' ? 'bn' : 'en',
    timezone: row.timezone,
    currency: row.currency,
    theme: row.theme,
    weekStartsOn: row.weekStartsOn,
    dateFormat: row.dateFormat,
    numberFormat: row.numberFormat,
    reducedMotion: row.reducedMotion,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Maps contract values to Prisma enum values (only supplied fields). */
function toDatabaseUpdate(update: ParsedPreferencesUpdate): Record<string, unknown> {
  return {
    ...(update.locale !== undefined ? { locale: update.locale === 'bn' ? 'BN' : 'EN' } : {}),
    ...(update.timezone !== undefined ? { timezone: update.timezone } : {}),
    ...(update.currency !== undefined ? { currency: update.currency } : {}),
    ...(update.theme !== undefined ? { theme: update.theme } : {}),
    ...(update.weekStartsOn !== undefined ? { weekStartsOn: update.weekStartsOn } : {}),
    ...(update.dateFormat !== undefined ? { dateFormat: update.dateFormat } : {}),
    ...(update.numberFormat !== undefined ? { numberFormat: update.numberFormat } : {}),
    ...(update.reducedMotion !== undefined ? { reducedMotion: update.reducedMotion } : {}),
  };
}
