import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestPrismaClient, resetDatabase, uniqueEmail } from './harness';
import {
  apiRequest,
  startTestApp,
  TEST_WEB_ORIGIN,
  type TestApp,
  type TestResponse,
} from './http-test-app';

/**
 * IT-3 acceptance against real PostgreSQL (ADR-0006): the full
 * sign-up → sign-in → authenticated request → sign-out flow through the REAL
 * HTTP stack (the same wiring `main.ts` uses), HttpOnly cookie sessions,
 * revocation and expiry, Argon2id hashes, fail-closed authorization,
 * generic auth errors, rate limits, and cross-user isolation.
 *
 * The test database is a single shared resource — this suite runs serially
 * with the others (`vitest.integration.config.mts`).
 */

const PASSWORD = 'integration-pass-12';

const prisma = createTestPrismaClient();
let testApp: TestApp;

beforeAll(async () => {
  testApp = await startTestApp();
});

afterAll(async () => {
  await testApp.app.close();
  await prisma.$disconnect();
});

beforeEach(async () => {
  await resetDatabase(prisma);
});

async function signUp(
  overrides: { email?: string; password?: string; name?: string } = {},
): Promise<TestResponse> {
  return apiRequest(testApp.baseUrl, {
    method: 'POST',
    path: '/api/v1/auth/sign-up/email',
    body: {
      name: 'Test User',
      email: overrides.email ?? uniqueEmail('signup'),
      password: overrides.password ?? PASSWORD,
    },
  });
}

async function signIn(
  email: string,
  password: string = PASSWORD,
  options: { ip?: string } = {},
): Promise<TestResponse> {
  return apiRequest(testApp.baseUrl, {
    method: 'POST',
    path: '/api/v1/auth/sign-in/email',
    body: { email, password },
    ...(options.ip ? { ip: options.ip } : {}),
  });
}

function sessionCookieHeader(response: TestResponse): string {
  const header = response.setCookie.find((value) => value.startsWith('better-auth.session_token='));
  if (!header) {
    throw new Error(`No session cookie in response (status ${response.status}).`);
  }
  return header;
}

/** `name=value` portion for use as a Cookie request header. */
function sessionCookie(response: TestResponse): string {
  return sessionCookieHeader(response).split(';')[0] ?? '';
}

function cookieAttributes(setCookieValue: string): string[] {
  return setCookieValue
    .split(';')
    .slice(1)
    .map((attribute) => attribute.trim().toLowerCase());
}

function messageOf(response: TestResponse): string {
  const message = (response.body as { message?: unknown } | null)?.message;
  if (typeof message !== 'string') {
    throw new Error(
      `Response has no message (status ${response.status}): ${JSON.stringify(response.body)}`,
    );
  }
  return message;
}

describe('registration and sign-in (real PostgreSQL)', () => {
  it('registers a user, stores an Argon2id hash, and starts a working session', async () => {
    const email = uniqueEmail('register');
    const response = await signUp({ email });

    expect(response.status).toBe(200);
    const body = response.body as { user: { id: string; email: string; name: string } };
    expect(body.user.email).toBe(email);

    // The session is an HttpOnly, SameSite=Lax cookie — never a token in a
    // body field the web app would have to store.
    const cookie = sessionCookieHeader(response);
    const attributes = cookieAttributes(cookie);
    expect(cookie.startsWith('better-auth.session_token=')).toBe(true);
    expect(attributes).toContain('httponly');
    expect(attributes).toContain('path=/');
    expect(attributes.some((attribute) => attribute === 'samesite=lax')).toBe(true);
    expect(attributes).toContain('max-age=2592000'); // 30-day absolute lifetime
    expect(attributes).not.toContain('secure'); // local http origin

    // The session authenticates `/me` and exposes only contract fields.
    const me = await apiRequest(testApp.baseUrl, {
      path: '/api/v1/me',
      cookie: sessionCookie(response),
    });
    expect(me.status).toBe(200);
    expect(Object.keys(me.body as object).sort()).toEqual([
      'createdAt',
      'email',
      'emailVerified',
      'id',
      'image',
      'name',
    ]);
    expect((me.body as { id: string }).id).toBe(body.user.id);
    expect((me.body as { email: string }).email).toBe(email);

    // The stored credential is an Argon2id hash with the reviewed
    // parameters — never plaintext (ADR-0006 decision 4).
    const account = await prisma.authAccount.findFirst({ where: { userId: body.user.id } });
    expect(account?.password?.startsWith('$argon2id$v=19$m=19456,t=2,p=1$')).toBe(true);
    expect(JSON.stringify(account)).not.toContain(PASSWORD);
  });

  it('rejects a duplicate email with a generic, safe error', async () => {
    const email = uniqueEmail('duplicate');
    expect((await signUp({ email })).status).toBe(200);

    const second = await signUp({ email });

    expect(second.status).toBe(422);
    expect(messageOf(second)).toMatch(/already exists/i);
    expect(JSON.stringify(second.body)).not.toContain(PASSWORD);
  });

  it('enforces the password length policy server-side', async () => {
    const tooShort = await signUp({ password: 'short-pass' });
    expect(tooShort.status).toBe(400);
    expect(messageOf(tooShort)).toMatch(/password too short/i);
    expect(JSON.stringify(tooShort.body)).not.toContain('short-pass');

    const tooLong = await signUp({ password: 'a'.repeat(129) });
    expect(tooLong.status).toBe(400);
    expect(messageOf(tooLong)).toMatch(/password too long/i);
  });

  it('signs in with the correct password and rejects wrong/unknown credentials generically', async () => {
    const email = uniqueEmail('signin');
    await signUp({ email });

    const wrongPassword = await signIn(email, 'definitely-wrong');
    const unknownUser = await signIn(uniqueEmail('unknown'));
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    // No account-existence oracle: both failures are indistinguishable.
    expect(messageOf(wrongPassword)).toBe(messageOf(unknownUser));
    expect(messageOf(wrongPassword)).toMatch(/invalid email or password/i);

    const signedIn = await signIn(email);
    expect(signedIn.status).toBe(200);

    const me = await apiRequest(testApp.baseUrl, {
      path: '/api/v1/me',
      cookie: sessionCookie(signedIn),
    });
    expect(me.status).toBe(200);
    expect((me.body as { email: string }).email).toBe(email);
  });
});

describe('sessions (real PostgreSQL)', () => {
  it('revokes the database session on sign-out and rejects the old cookie', async () => {
    const response = await signUp();
    const userId = (response.body as { user: { id: string } }).user.id;
    const cookie = sessionCookie(response);

    const signOut = await apiRequest(testApp.baseUrl, {
      method: 'POST',
      path: '/api/v1/auth/sign-out',
      cookie,
      origin: TEST_WEB_ORIGIN,
    });
    expect(signOut.status).toBe(200);
    expect((signOut.body as { success: boolean }).success).toBe(true);
    expect(await prisma.session.count({ where: { userId } })).toBe(0);

    const reuse = await apiRequest(testApp.baseUrl, { path: '/api/v1/me', cookie });
    expect(reuse.status).toBe(401);
  });

  it('rejects an expired session', async () => {
    const response = await signUp();
    const userId = (response.body as { user: { id: string } }).user.id;
    const cookie = sessionCookie(response);

    expect((await apiRequest(testApp.baseUrl, { path: '/api/v1/me', cookie })).status).toBe(200);

    await prisma.session.updateMany({
      where: { userId },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });

    expect((await apiRequest(testApp.baseUrl, { path: '/api/v1/me', cookie })).status).toBe(401);
  });

  it('rejects missing and tampered session cookies with a clear 401', async () => {
    const anonymous = await apiRequest(testApp.baseUrl, { path: '/api/v1/me' });
    expect(anonymous.status).toBe(401);
    expect(messageOf(anonymous)).toBe('Authentication required.');

    const tampered = await apiRequest(testApp.baseUrl, {
      path: '/api/v1/me',
      cookie: 'better-auth.session_token=forged.token-value',
    });
    expect(tampered.status).toBe(401);
    expect(messageOf(tampered)).toBe('Authentication required.');
  });
});

describe('authorization and isolation (real PostgreSQL)', () => {
  it('resolves each session to its own user and never trusts client-supplied ids', async () => {
    const userA = (await signUp()).body as { user: { id: string; email: string } };
    const userB = (await signUp()).body as { user: { id: string; email: string } };

    // Re-fetch sessions for both users to obtain both cookies cleanly.
    const signInA = await signIn(userA.user.email);
    const signInB = await signIn(userB.user.email);
    const cookieA = sessionCookie(signInA);
    const cookieB = sessionCookie(signInB);

    const meA = await apiRequest(testApp.baseUrl, { path: '/api/v1/me', cookie: cookieA });
    const meB = await apiRequest(testApp.baseUrl, { path: '/api/v1/me', cookie: cookieB });
    expect((meA.body as { id: string }).id).toBe(userA.user.id);
    expect((meB.body as { id: string }).id).toBe(userB.user.id);

    // A user id in the body can never redirect the write: the acting
    // identity is the verified session (requirements.md §5.1, §7.2).
    const patch = await apiRequest(testApp.baseUrl, {
      method: 'PATCH',
      path: '/api/v1/me',
      cookie: cookieA,
      body: { name: 'Renamed By A', userId: userB.user.id },
    });
    expect(patch.status).toBe(200);
    expect((patch.body as { id: string }).id).toBe(userA.user.id);
    expect((patch.body as { name: string }).name).toBe('Renamed By A');

    const storedB = await prisma.user.findUniqueOrThrow({ where: { id: userB.user.id } });
    expect(storedB.name).toBe('Test User');
    const storedA = await prisma.user.findUniqueOrThrow({ where: { id: userA.user.id } });
    expect(storedA.name).toBe('Renamed By A');
  });

  it('validates PATCH /me payloads with safe messages', async () => {
    const cookie = sessionCookie(await signUp());

    const missing = await apiRequest(testApp.baseUrl, {
      method: 'PATCH',
      path: '/api/v1/me',
      cookie,
      body: {},
    });
    expect(missing.status).toBe(400);
    expect(messageOf(missing)).toBe('"name" is required and must be a string.');

    const empty = await apiRequest(testApp.baseUrl, {
      method: 'PATCH',
      path: '/api/v1/me',
      cookie,
      body: { name: '   ' },
    });
    expect(empty.status).toBe(400);
    expect(messageOf(empty)).toBe('"name" must not be empty.');

    const tooLong = await apiRequest(testApp.baseUrl, {
      method: 'PATCH',
      path: '/api/v1/me',
      cookie,
      body: { name: 'a'.repeat(101) },
    });
    expect(tooLong.status).toBe(400);
    expect(messageOf(tooLong)).toBe('"name" must be at most 100 characters.');
  });
});

describe('CSRF origin checks and rate limits (real PostgreSQL)', () => {
  it('rejects cross-origin state-changing auth requests with a session cookie', async () => {
    const cookie = sessionCookie(await signUp());

    // Requests default to a browser-like trusted Origin; hostile origins are
    // rejected before the handler runs (Better Auth origin/CSRF gate).
    const hostile = await apiRequest(testApp.baseUrl, {
      method: 'POST',
      path: '/api/v1/auth/sign-out',
      cookie,
      origin: 'https://evil.example',
    });
    expect(hostile.status).toBe(403);
    expect(messageOf(hostile)).toMatch(/origin/i);

    // The session survives the blocked attempt.
    expect((await apiRequest(testApp.baseUrl, { path: '/api/v1/me', cookie })).status).toBe(200);

    const trusted = await apiRequest(testApp.baseUrl, {
      method: 'POST',
      path: '/api/v1/auth/sign-out',
      cookie,
      origin: TEST_WEB_ORIGIN,
    });
    expect(trusted.status).toBe(200);
  });

  it('rate limits sign-in per client IP with the standard error envelope', async () => {
    const limitedIp = '198.51.100.42';
    const otherIp = '198.51.100.43';
    const email = uniqueEmail('rate-limited');

    // Better Auth's built-in rule for /sign-in*: 3 requests per 10 seconds.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await signIn(email, 'wrong-password', { ip: limitedIp });
      expect(response.status).toBe(401);
    }

    const limited = await signIn(email, 'wrong-password', { ip: limitedIp });
    expect(limited.status).toBe(429);
    expect(messageOf(limited)).toBe('Too many requests. Please try again later.');
    expect(limited.headers.get('x-retry-after')).toBeTruthy();

    // Other clients stay unaffected (the limiter is keyed per IP + path).
    const other = await signIn(email, 'wrong-password', { ip: otherIp });
    expect(other.status).toBe(401);
  });

  it('serves health publicly while protected routes stay closed by default', async () => {
    const health = await apiRequest(testApp.baseUrl, { path: '/api/v1/health' });
    expect(health.status).toBe(200);
    expect(health.body).toEqual({
      status: 'ok',
      service: 'moneyflow-api',
      database: 'up',
    });

    const guarded = await apiRequest(testApp.baseUrl, { path: '/api/v1/me' });
    expect(guarded.status).toBe(401);
    expect(messageOf(guarded)).toBe('Authentication required.');
  });
});
