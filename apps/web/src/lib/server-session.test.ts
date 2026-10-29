import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { checkServerSession } from './server-session';

describe('checkServerSession', () => {
  beforeEach(() => {
    vi.stubEnv('API_URL', 'http://localhost:4000');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('reports invalid for a 401 from /me', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 401 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(checkServerSession('better-auth.session_token=abc')).resolves.toBe('invalid');
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/v1/me',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: expect.objectContaining({ cookie: 'better-auth.session_token=abc' }),
      }),
    );
  });

  it('reports valid when the API accepts the session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'u1' }), { status: 200 })),
    );
    await expect(checkServerSession('cookie')).resolves.toBe('valid');
  });

  it('does not treat an upstream failure as a valid session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(checkServerSession('cookie')).resolves.toBe('unknown');
  });

  it('reports unknown when the API is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(checkServerSession('cookie')).resolves.toBe('unknown');
  });

  it('reports unknown when no API URL is configured', async () => {
    vi.stubEnv('API_URL', '');
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    await expect(checkServerSession('cookie')).resolves.toBe('unknown');
  });
});
