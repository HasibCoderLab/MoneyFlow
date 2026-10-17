import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { AuthUser } from './auth.types';
import { MAX_DISPLAY_NAME_LENGTH, parseUpdateMeInput, toMeResponse } from './profile';

describe('parseUpdateMeInput', () => {
  it('accepts and trims a valid display name', () => {
    expect(parseUpdateMeInput({ name: '  Ada Lovelace  ' })).toEqual({ name: 'Ada Lovelace' });
  });

  it('ignores unknown fields — a client-supplied userId is never part of the payload', () => {
    expect(parseUpdateMeInput({ name: 'Ada', userId: 'someone-else' })).toEqual({ name: 'Ada' });
  });

  it('rejects missing, non-string, empty, or whitespace-only names', () => {
    for (const input of [{}, { name: 42 }, { name: '' }, { name: '   ' }, { name: null }]) {
      expect(() => parseUpdateMeInput(input)).toThrow(BadRequestException);
    }
  });

  it('rejects names longer than the limit', () => {
    const tooLong = 'a'.repeat(MAX_DISPLAY_NAME_LENGTH + 1);
    expect(() => parseUpdateMeInput({ name: tooLong })).toThrow(/at most 100 characters/);
    expect(parseUpdateMeInput({ name: 'a'.repeat(MAX_DISPLAY_NAME_LENGTH) })).toEqual({
      name: 'a'.repeat(MAX_DISPLAY_NAME_LENGTH),
    });
  });

  it('rejects control characters', () => {
    expect(() => parseUpdateMeInput({ name: 'Ada\nLovelace' })).toThrow(/control characters/);
    expect(() => parseUpdateMeInput({ name: 'Ada\u0000' })).toThrow(/control characters/);
    expect(() => parseUpdateMeInput({ name: 'Ada\u007f' })).toThrow(/control characters/);
  });

  it('rejects bodies that are not plain JSON objects', () => {
    for (const input of [undefined, null, 'Ada', 7, ['Ada']]) {
      expect(() => parseUpdateMeInput(input)).toThrow(BadRequestException);
    }
  });
});

describe('toMeResponse', () => {
  const user: AuthUser = {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    emailVerified: false,
    image: null,
    createdAt: new Date('2026-10-01T12:30:00.000Z'),
  };

  it('projects only public fields with an ISO timestamp', () => {
    const response = toMeResponse(user);
    expect(Object.keys(response).sort()).toEqual([
      'createdAt',
      'email',
      'emailVerified',
      'id',
      'image',
      'name',
    ]);
    expect(response.createdAt).toBe('2026-10-01T12:30:00.000Z');
  });

  it('normalizes an absent image to null', () => {
    expect(toMeResponse({ ...user, image: undefined }).image).toBeNull();
  });
});
