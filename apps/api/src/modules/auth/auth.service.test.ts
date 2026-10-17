import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthInstance } from './auth.tokens';
import type { AuthSession } from './auth.types';
import { AuthService } from './auth.service';

/**
 * Session-to-identity mapping tests: headers (the only credential input) are
 * forwarded to Better Auth, and the acting identity always comes from the
 * verified session — never from request input.
 */

const SESSION: AuthSession = {
  user: {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    emailVerified: false,
    image: null,
    createdAt: new Date('2026-10-01T12:30:00.000Z'),
  },
  session: { id: 'session-1', userId: 'user-1', expiresAt: new Date('2026-11-01T00:00:00Z') },
};

function createService() {
  const api = {
    getSession: vi.fn<AuthInstance['api']['getSession']>(),
    updateUser: vi.fn<AuthInstance['api']['updateUser']>(),
  };
  const auth = { api } as unknown as AuthInstance;
  return { service: new AuthService(auth), api };
}

describe('AuthService.getSession', () => {
  it('forwards the request headers to Better Auth and maps the session', async () => {
    const { service, api } = createService();
    api.getSession.mockResolvedValue(SESSION as never);

    const session = await service.getSession({
      cookie: 'better-auth.session_token=token-value',
    });

    expect(session).toEqual(SESSION);
    const [call] = api.getSession.mock.calls;
    const headers = call?.[0]?.headers;
    expect(headers).toBeInstanceOf(Headers);
    expect(headers?.get('cookie')).toBe('better-auth.session_token=token-value');
  });

  it('returns null when there is no valid session', async () => {
    const { service, api } = createService();
    api.getSession.mockResolvedValue(null as never);

    await expect(service.getSession({})).resolves.toBeNull();
  });
});

describe('AuthService.updateMe', () => {
  it('validates the payload before calling Better Auth', async () => {
    const { service, api } = createService();

    await expect(service.updateMe({}, { name: '' })).rejects.toBeInstanceOf(BadRequestException);
    expect(api.updateUser).not.toHaveBeenCalled();
  });

  it('updates only the display name and returns the fresh session profile', async () => {
    const { service, api } = createService();
    api.updateUser.mockResolvedValue({ status: true } as never);
    api.getSession.mockResolvedValue({
      ...SESSION,
      user: { ...SESSION.user, name: 'Ada New Name' },
    } as never);

    const response = await service.updateMe(
      { cookie: 'better-auth.session_token=token-value' },
      { name: '  Ada New Name  ', userId: 'someone-else' },
    );

    expect(api.updateUser).toHaveBeenCalledTimes(1);
    const [call] = api.updateUser.mock.calls;
    expect(call?.[0]?.body).toEqual({ name: 'Ada New Name' });
    expect(response.name).toBe('Ada New Name');
    expect(response.id).toBe('user-1');
  });

  it('fails closed when the session vanishes mid-update', async () => {
    const { service, api } = createService();
    api.updateUser.mockResolvedValue({ status: true } as never);
    api.getSession.mockResolvedValue(null as never);

    await expect(service.updateMe({}, { name: 'Ada' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
