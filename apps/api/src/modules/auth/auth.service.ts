import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import type { MeResponse } from '@moneyflow/contracts';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';

import { AUTH_INSTANCE, type AuthInstance } from './auth.tokens';
import type { AuthSession, AuthUser } from './auth.types';
import { parseUpdateMeInput, toMeResponse } from './profile';

/**
 * Thin application wrapper around Better Auth's server API. Session tokens,
 * password hashing, and user records are owned by the library (ADR-0006);
 * this service only forwards request headers, maps the session to the
 * application's public shapes, and enforces the request payload rules.
 *
 * The acting identity is ALWAYS derived from the verified session — a
 * client-supplied `userId` is never read or trusted (requirements.md §5.1,
 * §7.2).
 */
@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_INSTANCE) private readonly auth: AuthInstance) {}

  /**
   * Resolves the session for the given request headers, or `null` when the
   * request carries no valid session. Throws only on infrastructure errors
   * (e.g. database unavailable); the guard turns those into a fail-closed
   * 503 instead of a misleading 401.
   */
  public async getSession(headers: IncomingHttpHeaders): Promise<AuthSession | null> {
    const session = await this.auth.api.getSession({ headers: fromNodeHeaders(headers) });
    if (!session) {
      return null;
    }
    return { user: session.user, session: session.session };
  }

  /** Public projection of the authenticated user for `GET /api/v1/me`. */
  public getMe(user: AuthUser): MeResponse {
    return toMeResponse(user);
  }

  /** Updates the session user's display name and returns the fresh profile. */
  public async updateMe(headers: IncomingHttpHeaders, input: unknown): Promise<MeResponse> {
    const { name } = parseUpdateMeInput(input);

    await this.auth.api.updateUser({
      headers: fromNodeHeaders(headers),
      body: { name },
    });

    const session = await this.getSession(headers);
    if (!session) {
      // The guard just authenticated this request; a vanished session here
      // means the account was removed concurrently — still fail closed.
      throw new UnauthorizedException('Authentication required.');
    }
    return toMeResponse(session.user);
  }
}
