import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password';

/**
 * Argon2id policy tests (ADR-0006 decision 4): the PHC string pins the
 * algorithm, version, and cost parameters, so any drift in `ARGON2ID_PARAMS`
 * fails here before it can reach production hashes.
 */
describe('Argon2id password hashing', () => {
  it('hashes with the reviewed parameters and never embeds the plaintext', async () => {
    const password = 'correct horse battery staple';
    const hash = await hashPassword(password);

    expect(hash.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true);
    expect(hash).not.toContain(password);
  });

  it('uses a fresh library-generated salt for every hash', async () => {
    const [first, second] = await Promise.all([
      hashPassword('same password, different salt'),
      hashPassword('same password, different salt'),
    ]);

    expect(first).not.toEqual(second);
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('a-good-enough-passphrase');

    await expect(verifyPassword({ hash, password: 'a-good-enough-passphrase' })).resolves.toBe(
      true,
    );
    await expect(verifyPassword({ hash, password: 'wrong-password-entirely' })).resolves.toBe(
      false,
    );
  });

  it('fails closed on a malformed stored hash instead of throwing', async () => {
    await expect(verifyPassword({ hash: 'not-a-phc-hash', password: 'whatever' })).resolves.toBe(
      false,
    );
  });
});
