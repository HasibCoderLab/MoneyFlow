import type { GoalPriority, GoalStatus, GoalType } from '@moneyflow/contracts';

import type { TranslationKey } from './i18n/translations';

/**
 * Display labels for goal enumerations (IT-10). Typed maps keep the
 * dictionary key honest: every enum member must have exactly one reviewed
 * English and Bangla label (translations.ts is typed against the same key
 * union, so a missing translation fails `tsc`).
 */

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

export const GOAL_TYPE_LABEL: Record<GoalType, TranslationKey> = {
  GENERAL: 'goals.type.GENERAL',
  EMERGENCY_FUND: 'goals.type.EMERGENCY_FUND',
  EDUCATION: 'goals.type.EDUCATION',
  DEVICE: 'goals.type.DEVICE',
  TRAVEL: 'goals.type.TRAVEL',
  DEBT_PAYOFF: 'goals.type.DEBT_PAYOFF',
  CUSTOM: 'goals.type.CUSTOM',
};

export const GOAL_STATUS_LABEL: Record<GoalStatus, TranslationKey> = {
  ACTIVE: 'goals.status.active',
  PAUSED: 'goals.status.paused',
  COMPLETED: 'goals.status.completed',
  ARCHIVED: 'goals.status.archived',
};

export const GOAL_PRIORITY_LABEL: Record<GoalPriority, TranslationKey> = {
  LOW: 'goals.priority.LOW',
  MEDIUM: 'goals.priority.MEDIUM',
  HIGH: 'goals.priority.HIGH',
};
