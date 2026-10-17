/**
 * Browser-to-API authentication client (IT-3 wiring).
 *
 * The web app talks to the NestJS API directly: session cookies are
 * `HttpOnly`, so the browser (not JavaScript) carries them — every request
 * uses `credentials: 'include'` and nothing token-like is ever stored,
 * logged, or placed in a URL. CORS with credentials is allowlisted
 * server-side (`CORS_ORIGINS`); this module only reads the public base URL.
 *
 * Error copy stays generic (requirements.md §5.1): server messages come
 * from the API's safe error envelope, and every fallback avoids revealing
 * whether an email is registered.
 */

export interface AuthAccount {
  readonly id: string;
  readonly email: string;
  readonly name: string;
}

export interface AuthSession {
  readonly user: AuthAccount;
}

/** Thrown for every auth failure: safe message plus the HTTP status (0 = network). */
export class AuthError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
const UNAVAILABLE_MESSAGE = 'Sign-in is unavailable right now. Please try again later.';

/** Public API base URL, or null when the app is not configured for auth. */
export function getApiBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return null;
  }
  return raw.trim().replace(/\/+$/, '');
}

function readErrorMessage(body: unknown): string {
  if (typeof body === 'object' && body !== null) {
    const message = (body as Record<string, unknown>).message;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }
  }
  return FALLBACK_MESSAGE;
}

function readAccount(body: unknown): AuthAccount {
  const user =
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>).user : undefined;
  if (typeof user !== 'object' || user === null) {
    throw new AuthError(FALLBACK_MESSAGE, 200);
  }
  const record = user as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.email !== 'string') {
    throw new AuthError(FALLBACK_MESSAGE, 200);
  }
  return {
    id: record.id,
    email: record.email,
    name: typeof record.name === 'string' ? record.name : '',
  };
}

async function postAuth(path: string, payload: Record<string, string>): Promise<AuthSession> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new AuthError(UNAVAILABLE_MESSAGE, 0);
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/auth${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new AuthError(UNAVAILABLE_MESSAGE, 0);
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AuthError(readErrorMessage(body), response.status);
  }
  return { user: readAccount(body) };
}

/** Email/password sign-in — the session arrives as an HttpOnly cookie. */
export function signIn(input: { email: string; password: string }): Promise<AuthSession> {
  return postAuth('/sign-in/email', { email: input.email, password: input.password });
}

/** Email/password registration — Better Auth also starts a session here. */
export function signUp(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthSession> {
  return postAuth('/sign-up/email', {
    name: input.name,
    email: input.email,
    password: input.password,
  });
}

/** Signs out the current session (cookie-cleared server-side). */
export async function signOut(): Promise<void> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new AuthError(UNAVAILABLE_MESSAGE, 0);
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/auth/sign-out`, {
      method: 'POST',
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new AuthError(UNAVAILABLE_MESSAGE, 0);
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new AuthError(readErrorMessage(body), response.status);
  }
}

/** Current session, or null when signed out (401 is normal, not an error). */
export async function getSession(): Promise<AuthSession | null> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return null;
  }
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/v1/auth/get-session`, {
      credentials: 'include',
      headers: { accept: 'application/json' },
    });
  } catch {
    throw new AuthError(UNAVAILABLE_MESSAGE, 0);
  }
  if (response.status === 401) {
    return null;
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new AuthError(readErrorMessage(body), response.status);
  }
  if (!body) {
    return null;
  }
  return { user: readAccount(body) };
}
