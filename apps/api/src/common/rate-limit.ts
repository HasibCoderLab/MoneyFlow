import { Injectable } from '@nestjs/common';

/**
 * Small in-memory sliding-window limiter for the two new sensitive endpoints.
 *
 * The MVP runs a single API instance (ADR-0006/ADR-0011), so no Redis or
 * other dependency is justified. Keys are user-derived; values never contain
 * headers, tokens, or request bodies. A future multi-instance deployment
 * must replace this with a shared store.
 */
@Injectable()
export class RateLimiter {
  /**
   * Recent accepted attempt timestamps per key, oldest first. At most `limit`
   * entries are retained per key, so memory stays bounded by consumers.
   */
  private readonly attempts = new Map<string, number[]>();

  /**
   * Records one attempt and returns false when the key has exhausted its
   * rolling window. Rejected attempts are not stored, so they neither extend
   * nor reset the window. The optional `now` is injectable for deterministic
   * tests.
   */
  public consume(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
    this.prune(now);
    const cutoff = now - windowMs;
    const recent = (this.attempts.get(key) ?? []).filter((attempt) => attempt > cutoff);
    if (recent.length >= limit) {
      this.attempts.set(key, recent);
      return false;
    }
    recent.push(now);
    this.attempts.set(key, recent);
    return true;
  }

  /** Test/support hook; production code never needs to clear the limiter. */
  public reset(): void {
    this.attempts.clear();
  }

  private prune(now: number): void {
    // Keep the map bounded even when many distinct users are served. This is
    // not a security boundary; each key's sliding window still enforces its
    // limit. Only keys idle for a full day are dropped, which is longer than
    // either current window.
    if (this.attempts.size < 10_000) {
      return;
    }
    for (const [key, timestamps] of this.attempts) {
      const last = timestamps[timestamps.length - 1];
      if (last === undefined || now - last > 24 * 60 * 60 * 1000) {
        this.attempts.delete(key);
      }
    }
  }
}
