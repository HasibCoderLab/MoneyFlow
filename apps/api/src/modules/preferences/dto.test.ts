import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { DEFAULT_PREFERENCES, parseUpdatePreferencesInput } from './dto';

/**
 * IT-11 preferences input contract: documented defaults, partial updates,
 * strict unknown-field rejection, enum/IANA validation, and BDT-only storage
 * (requirements.md §5.2, ADR-0003/ADR-0010).
 */

function expectBadRequest(input: unknown, pattern?: RegExp): void {
  try {
    parseUpdatePreferencesInput(input);
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    if (pattern) {
      expect((error as BadRequestException).message).toMatch(pattern);
    }
    return;
  }
  throw new Error('Expected a BadRequestException.');
}

describe('DEFAULT_PREFERENCES', () => {
  it('matches the documented IT-11 defaults', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      locale: 'en',
      timezone: 'Asia/Dhaka',
      currency: 'BDT',
      theme: 'LIGHT',
      weekStartsOn: 'SATURDAY',
      dateFormat: 'DMY',
      numberFormat: 'LOCALE',
      reducedMotion: 'SYSTEM',
      updatedAt: null,
    });
  });
});

describe('parseUpdatePreferencesInput', () => {
  it('accepts every supported value independently', () => {
    expect(parseUpdatePreferencesInput({ locale: 'bn' })).toEqual({ locale: 'bn' });
    expect(parseUpdatePreferencesInput({ timezone: 'Pacific/Kiritimati' })).toEqual({
      timezone: 'Pacific/Kiritimati',
    });
    expect(parseUpdatePreferencesInput({ currency: 'BDT' })).toEqual({ currency: 'BDT' });
    expect(parseUpdatePreferencesInput({ theme: 'SYSTEM' })).toEqual({ theme: 'SYSTEM' });
    expect(parseUpdatePreferencesInput({ weekStartsOn: 'MONDAY' })).toEqual({
      weekStartsOn: 'MONDAY',
    });
    expect(parseUpdatePreferencesInput({ dateFormat: 'YMD' })).toEqual({ dateFormat: 'YMD' });
    expect(parseUpdatePreferencesInput({ numberFormat: 'BENGALI' })).toEqual({
      numberFormat: 'BENGALI',
    });
    expect(parseUpdatePreferencesInput({ reducedMotion: 'REDUCE' })).toEqual({
      reducedMotion: 'REDUCE',
    });
  });

  it('accepts a multi-field partial update', () => {
    expect(
      parseUpdatePreferencesInput({
        locale: 'bn',
        theme: 'DARK',
        weekStartsOn: 'SUNDAY',
        dateFormat: 'MDY',
        numberFormat: 'LATIN',
        reducedMotion: 'REDUCE',
        timezone: 'UTC',
      }),
    ).toEqual({
      locale: 'bn',
      theme: 'DARK',
      weekStartsOn: 'SUNDAY',
      dateFormat: 'MDY',
      numberFormat: 'LATIN',
      reducedMotion: 'REDUCE',
      timezone: 'UTC',
    });
  });

  it('rejects unknown fields instead of silently ignoring a typo', () => {
    expectBadRequest({ theme: 'DARK', userId: 'attacker' }, /Unknown field "userId"/);
    expectBadRequest({ timeZone: 'UTC' }, /Unknown field "timeZone"/);
  });

  it('rejects empty, non-object, and array bodies', () => {
    expectBadRequest({}, /at least one preference/i);
    expectBadRequest([], /JSON object/);
    expectBadRequest('theme=DARK', /JSON object/);
    expectBadRequest(null, /JSON object/);
  });

  it('rejects unsupported enum values and wrong types', () => {
    expectBadRequest({ locale: 'fr' }, /"locale" must be one of/);
    expectBadRequest({ theme: 'neon' }, /"theme" must be one of/);
    expectBadRequest({ weekStartsOn: 'FUNDAY' }, /"weekStartsOn" must be one of/);
    expectBadRequest({ dateFormat: 'DMYYYY' }, /"dateFormat" must be one of/);
    expectBadRequest({ numberFormat: 42 }, /"numberFormat" must be one of/);
    expectBadRequest({ reducedMotion: true }, /"reducedMotion" must be one of/);
  });

  it('rejects unknown or malformed timezones', () => {
    expectBadRequest({ timezone: 'Mars/Olympus' }, /valid IANA timezone/);
    expectBadRequest({ timezone: 7 }, /valid IANA timezone/);
  });

  it('rejects any currency other than the MVP BDT', () => {
    expectBadRequest({ currency: 'USD' }, /"currency" must be "BDT"/);
    expectBadRequest({ currency: 'usd' }, /"currency" must be "BDT"/);
    expectBadRequest({ currency: 123 }, /"currency" must be a string/);
  });
});
