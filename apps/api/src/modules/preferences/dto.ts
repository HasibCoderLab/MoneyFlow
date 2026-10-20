import { BadRequestException } from '@nestjs/common';
import {
  DEFAULT_USER_PREFERENCES,
  type DateFormatPreference,
  type NumberFormatPreference,
  type ReducedMotionPreference,
  type ThemePreference,
  type UiLocale,
  type UserPreferencesResponse,
  type WeekStartsOn,
} from '@moneyflow/contracts';

import { DEFAULT_CURRENCY_CODE, getCurrencyMetadata } from '../../domain/money/currency';
import { MoneyDomainError } from '../../domain/money/errors';
import { resolveTimezone } from '../transactions/occurrence';

/**
 * Validation and defaults for the IT-11 preferences endpoint
 * (requirements.md §5.2, ADR-0010).
 *
 * Display preferences only: nothing in this module reads or writes
 * transactions, accounts, budgets, or goals. Unknown fields are rejected so a
 * typo can never silently leave a setting unchanged. Defaults are explicit and
 * deterministic for users with no saved row.
 */

export const UI_LOCALES: readonly UiLocale[] = ['en', 'bn'];
export const THEMES: readonly ThemePreference[] = ['LIGHT', 'DARK', 'SYSTEM'];
export const WEEK_STARTS: readonly WeekStartsOn[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];
export const DATE_FORMATS: readonly DateFormatPreference[] = ['DMY', 'MDY', 'YMD'];
export const NUMBER_FORMATS: readonly NumberFormatPreference[] = ['LOCALE', 'LATIN', 'BENGALI'];
export const REDUCED_MOTION: readonly ReducedMotionPreference[] = ['SYSTEM', 'REDUCE'];

/** Documented defaults when a user has never saved preferences. */
export const DEFAULT_PREFERENCES: Readonly<UserPreferencesResponse> = Object.freeze({
  ...DEFAULT_USER_PREFERENCES,
  updatedAt: null,
});

/** Contract-shaped partial update produced by `parseUpdatePreferencesInput`. */
export interface ParsedPreferencesUpdate {
  readonly locale?: UiLocale;
  readonly timezone?: string;
  readonly currency?: string;
  readonly theme?: ThemePreference;
  readonly weekStartsOn?: WeekStartsOn;
  readonly dateFormat?: DateFormatPreference;
  readonly numberFormat?: NumberFormatPreference;
  readonly reducedMotion?: ReducedMotionPreference;
}

const UPDATE_FIELDS = new Set([
  'locale',
  'timezone',
  'currency',
  'theme',
  'weekStartsOn',
  'dateFormat',
  'numberFormat',
  'reducedMotion',
]);

function assertObject(input: unknown): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }
}

function parseEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new BadRequestException(`"${field}" must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

/** Validates `PATCH /api/v1/preferences`; rejects unknown/empty updates. */
export function parseUpdatePreferencesInput(input: unknown): ParsedPreferencesUpdate {
  assertObject(input);

  for (const key of Object.keys(input)) {
    if (!UPDATE_FIELDS.has(key)) {
      throw new BadRequestException(`Unknown field "${key}".`);
    }
  }

  const update: ParsedPreferencesUpdate = {
    locale: parseEnum(input.locale, 'locale', UI_LOCALES),
    timezone: input.timezone === undefined ? undefined : resolveTimezone(input.timezone),
    currency: parseCurrency(input.currency),
    theme: parseEnum(input.theme, 'theme', THEMES),
    weekStartsOn: parseEnum(input.weekStartsOn, 'weekStartsOn', WEEK_STARTS),
    dateFormat: parseEnum(input.dateFormat, 'dateFormat', DATE_FORMATS),
    numberFormat: parseEnum(input.numberFormat, 'numberFormat', NUMBER_FORMATS),
    reducedMotion: parseEnum(input.reducedMotion, 'reducedMotion', REDUCED_MOTION),
  };

  // Remove undefined keys so "omitted" and "not supplied" are unambiguous.
  const defined = Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined),
  ) as ParsedPreferencesUpdate;

  if (Object.keys(defined).length === 0) {
    throw new BadRequestException('Provide at least one preference to update.');
  }

  return defined;
}

/**
 * The MVP accepts BDT only. A different code is rejected rather than silently
 * stored or converted (requirements.md §5.2, DR-08/ADR-0003).
 */
function parseCurrency(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('"currency" must be a string.');
  }
  try {
    return getCurrencyMetadata(value).code;
  } catch (error) {
    if (error instanceof MoneyDomainError) {
      throw new BadRequestException(
        `"currency" must be "${DEFAULT_CURRENCY_CODE}" in the MVP (multi-currency is not enabled).`,
      );
    }
    throw error;
  }
}
