import { describe, expect, it } from 'vitest';

import { RateLimiter } from './rate-limit';

/** Sliding-window limiter used by export and account deletion (ADR-0011). */

describe('RateLimiter', () => {
  it('allows exactly the configured attempts inside one window', () => {
    const limiter = new RateLimiter();
    const start = 1_000_000;

    expect(limiter.consume('u1', 3, 60_000, start)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, start + 1)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, start + 2)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, start + 3)).toBe(false);
    // A rejected attempt does not extend or reset the window.
    expect(limiter.consume('u1', 3, 60_000, start + 59_999)).toBe(false);
  });

  it('rolls individual attempts out instead of resetting all at once', () => {
    const limiter = new RateLimiter();

    expect(limiter.consume('u1', 3, 60_000, 0)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, 10_000)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, 20_000)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, 30_000)).toBe(false);

    // At 60s only the attempt from 0s has aged out; 10s and 20s still count.
    expect(limiter.consume('u1', 3, 60_000, 60_000)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, 60_001)).toBe(false);
    expect(limiter.consume('u1', 3, 60_000, 70_001)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, 80_001)).toBe(true);
    expect(limiter.consume('u1', 3, 60_000, 80_001)).toBe(false);
  });

  it('keys are independent (one user cannot exhaust another user)', () => {
    const limiter = new RateLimiter();
    expect(limiter.consume('export:user-a', 1, 60_000, 0)).toBe(true);
    expect(limiter.consume('export:user-a', 1, 60_000, 0)).toBe(false);
    expect(limiter.consume('export:user-b', 1, 60_000, 0)).toBe(true);
    expect(limiter.consume('deletion:user-a', 1, 60_000, 0)).toBe(true);
  });

  it('can be reset for repeatable tests', () => {
    const limiter = new RateLimiter();
    expect(limiter.consume('u1', 1, 60_000, 0)).toBe(true);
    expect(limiter.consume('u1', 1, 60_000, 0)).toBe(false);
    limiter.reset();
    expect(limiter.consume('u1', 1, 60_000, 0)).toBe(true);
  });
});
