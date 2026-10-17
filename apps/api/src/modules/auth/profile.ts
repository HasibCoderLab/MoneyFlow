import { BadRequestException } from '@nestjs/common';
import type { MeResponse } from '@moneyflow/contracts';

import type { AuthUser } from './auth.types';

/**
 * Pure mapping/validation for the thin `/me` endpoints (IT-3). Kept out of
 * the controller so the rules are unit-testable and identity can only ever
 * come from the verified session — the request body never carries a user id.
 */

export const MAX_DISPLAY_NAME_LENGTH = 100;

/** Validates and normalizes the `PATCH /api/v1/me` body. */
export function parseUpdateMeInput(input: unknown): { name: string } {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BadRequestException('Request body must be a JSON object.');
  }

  const name = (input as Record<string, unknown>).name;
  if (typeof name !== 'string') {
    throw new BadRequestException('"name" is required and must be a string.');
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException('"name" must not be empty.');
  }
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new BadRequestException(`"name" must be at most ${MAX_DISPLAY_NAME_LENGTH} characters.`);
  }
  if (hasControlCharacter(trimmed)) {
    throw new BadRequestException('"name" must not contain control characters.');
  }

  return { name: trimmed };
}

/** Safe public projection of an authenticated user (`GET /api/v1/me`). */
export function toMeResponse(user: AuthUser): MeResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
    createdAt: user.createdAt.toISOString(),
  };
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
