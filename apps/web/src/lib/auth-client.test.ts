import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthError, getApiBaseUrl, getSession, signIn, signOut, signUp } from './auth-client';

const BASE_URL = 'http://localhost:4000';

function mockFetchOnce(response: { ok?: boolean; status?: number; body?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json:
      response.body === undefined
        ? () => Promise.reject(new Error('empty'))
        : () => Promise.resolve(response.body),
  } as unknown as Response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function catchAuthError(task: Promise<unknown>): Promise<AuthError> {
  try {
    await task;
  } catch (error) {
    expect(error).toBeInstanceOf(AuthError);
    return error as AuthError;
  }
  throw new Error('Expected the auth call to fail.');
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_API_URL;
});

describe('getApiBaseUrl', () => {
  it('returns null when unconfigured and trims slashes otherwise', () => {
    expect(getApiBaseUrl()).toBeNull();
    process.env.NEXT_PUBLIC_API_URL = `${BASE_URL}///`;
    expect(getApiBaseUrl()).toBe(BASE_URL);
  });
});

describe('signIn', () => {
  it('posts credentials with cookies and returns the account', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({
      body: { user: { id: 'u-1', email: 'a@example.com', name: 'Ada' } },
    });

    const session = await signIn({ email: 'a@example.com', password: 'x'.repeat(12) });

    expect(session.user.email).toBe('a@example.com');
    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/auth/sign-in/email`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: JSON.stringify({ email: 'a@example.com', password: 'x'.repeat(12) }),
      }),
    );
  });

  it('surfaces the safe server message on failure', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    mockFetchOnce({ ok: false, status: 401, body: { message: 'Invalid email or password.' } });

    const error = await catchAuthError(
      signIn({ email: 'a@example.com', password: 'x'.repeat(12) }),
    );
    expect(error.message).toBe('Invalid email or password.');
    expect(error.status).toBe(401);
  });

  it('reports unavailability without a configured base URL', async () => {
    const error = await catchAuthError(
      signIn({ email: 'a@example.com', password: 'x'.repeat(12) }),
    );
    expect(error.message).toMatch(/unavailable/i);
  });

  it('reports network failures as unavailable', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const error = await catchAuthError(
      signIn({ email: 'a@example.com', password: 'x'.repeat(12) }),
    );
    expect(error.message).toMatch(/unavailable/i);
    expect(error.status).toBe(0);
  });
});

describe('signUp', () => {
  it('registers with name, email, and password', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    const fetchMock = mockFetchOnce({
      body: { user: { id: 'u-2', email: 'b@example.com', name: 'Bo' } },
    });

    await signUp({ name: 'Bo', email: 'b@example.com', password: 'y'.repeat(12) });

    expect(fetchMock).toHaveBeenCalledWith(
      `${BASE_URL}/api/v1/auth/sign-up/email`,
      expect.objectContaining({
        body: JSON.stringify({ name: 'Bo', email: 'b@example.com', password: 'y'.repeat(12) }),
      }),
    );
  });
});

describe('signOut and getSession', () => {
  it('signs out and maps 401 sessions to null', async () => {
    process.env.NEXT_PUBLIC_API_URL = BASE_URL;
    mockFetchOnce({ body: {} });
    await expect(signOut()).resolves.toBeUndefined();

    mockFetchOnce({ ok: false, status: 401, body: { message: 'Unauthorized.' } });
    await expect(getSession()).resolves.toBeNull();
  });
});
