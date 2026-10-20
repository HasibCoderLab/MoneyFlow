import { BadRequestException } from '@nestjs/common';
import type { GoalPriority, GoalType } from '@moneyflow/contracts';

import { MoneyDomainError } from '../../domain/money/errors';
import { parsePositiveAmountToMinor } from '../../domain/money/amount';
import { assertLocalDate } from '../summary/summary-periods';

/**
 * Structural validation for the goal endpoints (IT-10, ADR-0005,
 * requirements.md §5.8/§8.6, domain-model.md "Goal and GoalContribution").
 *
 * Same style as the budgets DTO: shapes, grammars, and enumerations live
 * here; ownership, lifecycle transitions, and cross-record rules live in the
 * service and the database. Money crosses the boundary as a canonical decimal
 * string and is parsed with the shared strict grammar — never through a
 * JavaScript `number` (ADR-0003).
 *
 * Unknown fields are rejected rather than ignored so a typo in a client
 * (`targetMinor` instead of `target`) fails loudly instead of silently
 * leaving a goal without its intended change.
 */

export const MAX_GOAL_NAME_LENGTH = 80;
export const MAX_NOTE_LENGTH = 500;

export const GOAL_TYPES: readonly GoalType[] = [
  'GENERAL',
  'EMERGENCY_FUND',
  'EDUCATION',
  'DEVICE',
  'TRAVEL',
  'DEBT_PAYOFF',
  'CUSTOM',
];

export const GOAL_PRIORITIES: readonly GoalPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

const CREATE_FIELDS = new Set(['name', 'type', 'target', 'startDate', 'deadline', 'priority']);
const UPDATE_FIELDS = new Set(['name', 'type', 'target', 'startDate', 'deadline', 'priority']);
const CONTRIBUTION_FIELDS = new Set(['amount', 'occurredDate', 'note']);

function assertObject(input: unknown): asserts input is Record<string, unknown> {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }
}

function assertKnownFields(record: Record<string, unknown>, allowed: ReadonlySet<string>): void {
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new BadRequestException(`Unknown field "${key}".`);
    }
  }
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0;
    if (code < 32 || code === 127) {
      return true;
    }
  }
  return false;
}

function parseName(value: unknown, required: boolean): string | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"name" is required and must be a string.');
    }
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('"name" must be a string.');
  }
  const name = value.trim();
  if (name.length === 0) {
    throw new BadRequestException('"name" must not be empty.');
  }
  if (name.length > MAX_GOAL_NAME_LENGTH) {
    throw new BadRequestException(`"name" must be at most ${MAX_GOAL_NAME_LENGTH} characters.`);
  }
  if (hasControlCharacter(name)) {
    throw new BadRequestException('"name" must not contain control characters.');
  }
  return name;
}

function parseType(value: unknown, required: boolean): GoalType | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"type" is required and must be a goal type.');
    }
    return undefined;
  }
  if (typeof value !== 'string' || !GOAL_TYPES.includes(value as GoalType)) {
    throw new BadRequestException(`"type" must be one of: ${GOAL_TYPES.join(', ')}.`);
  }
  return value as GoalType;
}

function parsePriority(value: unknown, required: boolean): GoalPriority | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"priority" is required and must be a priority.');
    }
    return undefined;
  }
  if (typeof value !== 'string' || !GOAL_PRIORITIES.includes(value as GoalPriority)) {
    throw new BadRequestException(`"priority" must be one of: ${GOAL_PRIORITIES.join(', ')}.`);
  }
  return value as GoalPriority;
}

/** Parses a positive goal target; maps money-domain errors to 400. */
function parseTarget(value: unknown, required: boolean): bigint | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"target" is required and must be a string.');
    }
    return undefined;
  }
  try {
    return parsePositiveAmountToMinor(value);
  } catch (error) {
    if (error instanceof MoneyDomainError) {
      throw new BadRequestException(`"target" ${error.message.toLowerCase()}`);
    }
    throw error;
  }
}

/** Parses a strictly positive contribution amount; maps money errors to 400. */
function parseContributionAmount(value: unknown): bigint {
  try {
    return parsePositiveAmountToMinor(value);
  } catch (error) {
    if (error instanceof MoneyDomainError) {
      throw new BadRequestException(`"amount" ${error.message.toLowerCase()}`);
    }
    throw error;
  }
}

function parseDate(value: unknown, field: string, required: boolean): string | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException(`"${field}" is required and must be a date (YYYY-MM-DD).`);
    }
    return undefined;
  }
  return assertLocalDate(value, field);
}

function parseOptionalDeadline(value: unknown, required: boolean): string | null | undefined {
  if (value === undefined) {
    if (required) {
      throw new BadRequestException('"deadline" is required and must be a date or null.');
    }
    return undefined;
  }
  if (value === null) {
    return null;
  }
  return assertLocalDate(value, 'deadline');
}

function parseNote(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException('"note" must be a string.');
  }
  const note = value.trim();
  if (note.length === 0) {
    return null;
  }
  if (note.length > MAX_NOTE_LENGTH) {
    throw new BadRequestException(`"note" must be at most ${MAX_NOTE_LENGTH} characters.`);
  }
  if (hasControlCharacter(note)) {
    throw new BadRequestException('"note" must not contain control characters.');
  }
  return note;
}

/** Throws unless `deadline` is null or at/after `startDate` (both local dates). */
export function assertDeadlineNotBeforeStart(
  startDate: string,
  deadline: string | null | undefined,
): void {
  if (deadline === null || deadline === undefined) {
    return;
  }
  // `YYYY-MM-DD` sorts lexicographically in date order.
  if (deadline < startDate) {
    throw new BadRequestException('"deadline" must not be before "startDate".');
  }
}

export interface CreateGoalInput {
  readonly name: string;
  readonly type: GoalType;
  readonly targetMinor: bigint;
  readonly startDate: string;
  readonly deadline: string | null;
  readonly priority: GoalPriority;
}

export interface UpdateGoalInput {
  readonly name?: string;
  readonly type?: GoalType;
  readonly targetMinor?: bigint;
  readonly startDate?: string;
  /** `undefined` = untouched; `null` = clear. */
  readonly deadline?: string | null;
  readonly priority?: GoalPriority;
}

export interface CreateContributionInput {
  readonly amountMinor: bigint;
  /** Validated local date; `undefined` = default to today in the service. */
  readonly occurredDate?: string;
  readonly note: string | null;
}

export interface ListGoalsQuery {
  readonly includeArchived: boolean;
}

/** Validates the `POST /api/v1/goals` body; defaults `type`/`priority`. */
export function parseCreateGoalInput(input: unknown): CreateGoalInput {
  assertObject(input);
  assertKnownFields(input, CREATE_FIELDS);
  const startDate = parseDate(input.startDate, 'startDate', true) as string;
  const deadline = parseOptionalDeadline(input.deadline, false) ?? null;
  assertDeadlineNotBeforeStart(startDate, deadline);
  return {
    name: parseName(input.name, true) as string,
    type: parseType(input.type, false) ?? 'GENERAL',
    targetMinor: parseTarget(input.target, true) as bigint,
    startDate,
    deadline,
    priority: parsePriority(input.priority, false) ?? 'MEDIUM',
  };
}

/**
 * Validates the `PATCH /api/v1/goals/:id` body; all fields optional.
 * `status` is rejected explicitly: lifecycle moves have their own endpoints
 * (same rule as budgets, `STATUS_ENDPOINT_ONLY`).
 */
export function parseUpdateGoalInput(input: unknown): UpdateGoalInput {
  assertObject(input);
  if (input['status'] !== undefined) {
    throw new BadRequestException(
      'Goal status changes go through the pause/resume/complete/archive endpoints (STATUS_ENDPOINT_ONLY).',
    );
  }
  assertKnownFields(input, UPDATE_FIELDS);
  const result: {
    name?: string;
    type?: GoalType;
    targetMinor?: bigint;
    startDate?: string;
    deadline?: string | null;
    priority?: GoalPriority;
  } = {};

  const name = parseName(input.name, false);
  if (name !== undefined) {
    result.name = name;
  }
  const type = parseType(input.type, false);
  if (type !== undefined) {
    result.type = type;
  }
  const target = parseTarget(input.target, false);
  if (target !== undefined) {
    result.targetMinor = target;
  }
  const startDate = parseDate(input.startDate, 'startDate', false);
  if (startDate !== undefined) {
    result.startDate = startDate;
  }
  const deadline = parseOptionalDeadline(input.deadline, false);
  if (deadline !== undefined) {
    result.deadline = deadline;
  }
  const priority = parsePriority(input.priority, false);
  if (priority !== undefined) {
    result.priority = priority;
  }
  return result;
}

/** Validates the `POST /api/v1/goals/:id/contributions` body. */
export function parseCreateContributionInput(input: unknown): CreateContributionInput {
  assertObject(input);
  assertKnownFields(input, CONTRIBUTION_FIELDS);
  return {
    amountMinor: parseContributionAmount(input.amount),
    occurredDate: parseDate(input.occurredDate, 'occurredDate', false),
    note: parseNote(input.note),
  };
}

/** Validates the `GET /api/v1/goals` query string. */
export function parseListGoalsQuery(input: unknown): ListGoalsQuery {
  assertObject(input);
  for (const key of Object.keys(input)) {
    if (key !== 'includeArchived') {
      throw new BadRequestException(`Unknown query parameter "${key}".`);
    }
  }
  const value = input['includeArchived'];
  if (value === undefined) {
    return { includeArchived: false };
  }
  if (value === 'true') {
    return { includeArchived: true };
  }
  if (value === 'false') {
    return { includeArchived: false };
  }
  throw new BadRequestException('"includeArchived" must be "true" or "false".');
}
