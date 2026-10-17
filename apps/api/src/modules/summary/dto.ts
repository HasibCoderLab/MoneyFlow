import { BadRequestException } from '@nestjs/common';
import type { ReportGranularity } from '@moneyflow/contracts';

import { resolveSummaryPeriod, type ResolvedSummaryPeriod } from './summary-periods';

/**
 * Query validation for the summary/dashboard/report endpoints (IT-8).
 *
 * Structural checks live here; period semantics and every date/timezone
 * boundary are resolved and validated by `resolveSummaryPeriod`. Unknown
 * query parameters are ignored, matching the transactions list endpoint.
 */

export const DEFAULT_RECENT_LIMIT = 5;
export const MAX_RECENT_LIMIT = 20;

export const REPORT_GRANULARITIES: readonly ReportGranularity[] = ['daily', 'weekly', 'monthly'];

export interface ParsedSummaryQuery {
  readonly period: ResolvedSummaryPeriod;
  /** Bounded recent-activity size (dashboard); default 5. */
  readonly recentLimit: number;
  /** Series granularity (reports/summary); default `daily`. */
  readonly granularity: ReportGranularity;
}

export function parseSummaryQuery(
  query: Record<string, unknown>,
  now: Date = new Date(),
): ParsedSummaryQuery {
  return {
    period: resolveSummaryPeriod(
      { dateFrom: query.dateFrom, dateTo: query.dateTo, timezone: query.timezone },
      now,
    ),
    recentLimit: parseRecentLimit(query.recentLimit),
    granularity: parseGranularity(query.granularity),
  };
}

function parseRecentLimit(value: unknown): number {
  if (value === undefined) {
    return DEFAULT_RECENT_LIMIT;
  }
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (
    !Number.isInteger(parsed) ||
    (parsed as number) < 1 ||
    (parsed as number) > MAX_RECENT_LIMIT
  ) {
    throw new BadRequestException(
      `"recentLimit" must be an integer from 1 to ${MAX_RECENT_LIMIT}.`,
    );
  }
  return parsed as number;
}

function parseGranularity(value: unknown): ReportGranularity {
  if (value === undefined) {
    return 'daily';
  }
  if (typeof value !== 'string' || !(REPORT_GRANULARITIES as readonly string[]).includes(value)) {
    throw new BadRequestException(
      `"granularity" must be one of: ${REPORT_GRANULARITIES.join(', ')}.`,
    );
  }
  return value as ReportGranularity;
}
