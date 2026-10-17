import type { ExecutionContext } from '@nestjs/common';
import { Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { AuthGuard } from './auth.guard';
import type { AuthService } from './auth.service';
import type { AuthSession, AuthenticatedRequest } from './auth.types';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * Guard behavior (IT-3 acceptance): protected by default, explicit public
 * allowlist, unauthenticated requests rejected with a clear error, and
 * infrastructure failures fail closed with 503 — never a bypass.
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

function createGuard(
  options: { isPublic?: boolean; failure?: boolean; session?: AuthSession | null } = {},
) {
  const reflector = {
    getAllAndOverride: vi.fn().mockReturnValue(options.isPublic ?? false),
  } as unknown as Reflector;
  const authService = {
    getSession: vi.fn(async () => {
      if (options.failure) {
        throw new Error('database unavailable');
      }
      return options.session === undefined ? SESSION : options.session;
    }),
  } as unknown as AuthService;
  return { guard: new AuthGuard(reflector, authService), reflector, authService };
}

function contextFor(request: Partial<AuthenticatedRequest> = {}): {
  context: ExecutionContext;
  request: AuthenticatedRequest;
} {
  const authenticatedRequest: AuthenticatedRequest = { headers: {}, ...request };
  const context = {
    getHandler: () => 'handler',
    getClass: () => 'controller',
    switchToHttp: () => ({ getRequest: () => authenticatedRequest }),
  } as unknown as ExecutionContext;
  return { context, request: authenticatedRequest };
}

describe('AuthGuard', () => {
  it('lets public routes through without resolving a session', async () => {
    const { guard, authService, reflector } = createGuard({ isPublic: true });
    const { context } = contextFor();

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
      'handler',
      'controller',
    ]);
    expect(authService.getSession).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests with a clear 401', async () => {
    const { guard } = createGuard({ session: null });
    const { context, request } = contextFor();

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      constructor: UnauthorizedException,
      message: 'Authentication required.',
    });
    expect(request.auth).toBeUndefined();
  });

  it('attaches the verified session for protected routes', async () => {
    const { guard } = createGuard();
    const { context, request } = contextFor({ headers: { cookie: 'session-cookie' } });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.auth).toEqual(SESSION);
  });

  it('fails closed with 503 when session lookup is unavailable', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const { guard } = createGuard({ failure: true });
    const { context, request } = contextFor();

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      constructor: ServiceUnavailableException,
      message: 'Authentication is temporarily unavailable.',
    });
    expect(request.auth).toBeUndefined();
    // Diagnostics must never include header/cookie material.
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('cookie');
  });
});
