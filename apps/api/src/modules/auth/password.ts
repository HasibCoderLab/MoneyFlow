import { hash, verify } from '@node-rs/argon2';
import type { Options } from '@node-rs/argon2';

/**
 * Password hashing for Better Auth's email/password hooks (ADR-0006
 * decision 4): Argon2id at the OWASP-recommended minimum parameters
 * (m=19456 KiB, t=2, p=1), library-generated 16-byte salt, 32-byte output.
 *
 * No password, hash, or derived value is ever logged.
 */

/**
 * `Algorithm.Argon2id` of @node-rs/argon2 (value 2). The package declares
 * the enum as an ambient `const enum`, which TypeScript cannot reference as
 * a value under `isolatedModules`; `password.test.ts` pins the runtime
 * behavior instead — every produced hash must be a
 * `$argon2id$v=19$m=19456,t=2,p=1$…` PHC string, so a drift fails CI.
 */
const ARGON2ID = 2 as NonNullable<Options['algorithm']>;

export const ARGON2ID_PARAMS: Options = {
  algorithm: ARGON2ID,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2ID_PARAMS);
}

export async function verifyPassword(data: { hash: string; password: string }): Promise<boolean> {
  try {
    return await verify(data.hash, data.password);
  } catch {
    // A malformed stored hash fails closed instead of crashing the request.
    // The value is credential material and must never be logged.
    return false;
  }
}
