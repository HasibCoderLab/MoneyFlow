import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { parseDeleteAccountInput } from './deletion';

/**
 * The deletion request contract (IT-12, ADR-0011): exact phrase, non-empty
 * password, no alternate identity field, and safe rejection messages.
 */

const PASSWORD = 'integration-pass-12';

function messageOf(task: () => unknown): string {
  try {
    task();
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    return (error as BadRequestException).message;
  }
  throw new Error('Expected a BadRequestException.');
}

describe('parseDeleteAccountInput', () => {
  it('accepts the exact confirmation phrase and keeps the password untouched', () => {
    expect(parseDeleteAccountInput({ password: PASSWORD, confirmation: 'DELETE' })).toEqual({
      password: PASSWORD,
      confirmation: 'DELETE',
    });
  });

  it.each(['delete', 'DELETE ', ' delete', 'YES', '', undefined])(
    'rejects confirmation %p',
    (confirmation) => {
      const message = messageOf(() =>
        parseDeleteAccountInput({ password: PASSWORD, confirmation }),
      );
      expect(message).toBe('"confirmation" must be exactly "DELETE".');
    },
  );

  it('rejects missing, empty, non-string, and overlong passwords without echoing them', () => {
    for (const password of [undefined, '', 42, 'a'.repeat(129)]) {
      const message = messageOf(() =>
        parseDeleteAccountInput({ password, confirmation: 'DELETE' }),
      );
      if (password !== undefined && password !== '') {
        expect(message).not.toContain(String(password));
      }
      expect(message).toMatch(/^"password"/);
    }
  });

  it('rejects non-object bodies and ignores extra fields rather than trusting a user id', () => {
    expect(messageOf(() => parseDeleteAccountInput(null))).toMatch(/JSON object/i);
    expect(messageOf(() => parseDeleteAccountInput([]))).toMatch(/JSON object/i);

    expect(
      parseDeleteAccountInput({
        password: PASSWORD,
        confirmation: 'DELETE',
        userId: 'attacker-supplied-id',
      }),
    ).toEqual({ password: PASSWORD, confirmation: 'DELETE' });
  });
});
