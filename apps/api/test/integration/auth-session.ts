import { uniqueEmail } from './harness';
import { apiRequest, type TestResponse } from './http-test-app';

/**
 * Shared sign-up helper for the financial-domain integration suites.
 * Each suite truncates all tables in `beforeEach`, so every user here is
 * freshly registered through the real Better Auth endpoints and acts only
 * with the HttpOnly session cookie issued at sign-up — exactly like the
 * web app would.
 */

const PASSWORD = 'integration-pass-12';

export interface TestAccount {
  email: string;
  userId: string;
  cookie: string;
}

function sessionCookie(response: TestResponse): string {
  const header = response.setCookie.find((value) => value.startsWith('better-auth.session_token='));
  if (!header) {
    throw new Error(`No session cookie in response (status ${response.status}).`);
  }
  return header.split(';')[0] ?? '';
}

/** Registers a user and returns the session cookie plus the user id. */
export async function signUpUser(baseUrl: string, prefix: string): Promise<TestAccount> {
  const email = uniqueEmail(prefix);
  const response = await apiRequest(baseUrl, {
    method: 'POST',
    path: '/api/v1/auth/sign-up/email',
    body: { name: 'Test User', email, password: PASSWORD },
  });
  if (response.status !== 200) {
    throw new Error(`Sign-up failed (status ${response.status}): ${JSON.stringify(response.body)}`);
  }
  const userId = (response.body as { user?: { id?: unknown } })?.user?.id;
  if (typeof userId !== 'string') {
    throw new Error(`Sign-up response has no user id: ${JSON.stringify(response.body)}`);
  }
  return { email, userId, cookie: sessionCookie(response) };
}

/** Authenticated request shorthand for the financial endpoints. */
export function authed(
  baseUrl: string,
  account: TestAccount,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    body?: unknown;
    headers?: Record<string, string>;
  },
) {
  return apiRequest(baseUrl, {
    method: options.method ?? 'GET',
    path: options.path,
    body: options.body,
    cookie: account.cookie,
    headers: options.headers,
  });
}
