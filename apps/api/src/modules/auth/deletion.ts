import { BadRequestException } from '@nestjs/common';
import { DELETE_ACCOUNT_CONFIRMATION } from '@moneyflow/contracts';

/**
 * Pure validation for the self-service account-deletion request (IT-12,
 * ADR-0011). Kept beside the other `/me` input rules so the exact phrase and
 * password-shape checks are unit-testable without a database.
 *
 * The body can never select a different user: the route passes only the
 * verified session identity to the deletion service.
 */

/** Existing password policy ceiling (ADR-0006); never log the value. */
export const MAX_DELETION_PASSWORD_LENGTH = 128;

export interface ParsedDeleteAccountInput {
  readonly password: string;
  readonly confirmation: string;
}

export function parseDeleteAccountInput(input: unknown): ParsedDeleteAccountInput {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const record = input as Record<string, unknown>;

  if (typeof record.password !== 'string' || record.password.length === 0) {
    throw new BadRequestException('"password" is required.');
  }
  if (record.password.length > MAX_DELETION_PASSWORD_LENGTH) {
    throw new BadRequestException('"password" is invalid.');
  }
  if (record.confirmation !== DELETE_ACCOUNT_CONFIRMATION) {
    throw new BadRequestException(
      `"confirmation" must be exactly "${DELETE_ACCOUNT_CONFIRMATION}".`,
    );
  }

  return { password: record.password, confirmation: record.confirmation };
}
