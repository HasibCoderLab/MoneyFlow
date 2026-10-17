import type { ExecutionContext } from '@nestjs/common';
import { SetMetadata, createParamDecorator } from '@nestjs/common';

import type { AuthUser, AuthenticatedRequest } from './auth.types';

/**
 * Explicit public allowlist marker (ADR-0006): every route is protected by
 * the global `AuthGuard` unless the handler or its controller is `@Public()`.
 * Used in IT-3 only by the health endpoint; auth endpoints are mounted
 * outside Nest routing.
 */
export const IS_PUBLIC_KEY = 'moneyflow:isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * Injects the authenticated user resolved by `AuthGuard` from the verified
 * session. The value is never taken from request input.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.auth) {
      // Unreachable through the guard on a protected route; kept fail-closed
      // so a mis-wired public route never silently receives an empty user.
      throw new Error('@CurrentUser() used without an authenticated session.');
    }
    return request.auth.user;
  },
);
