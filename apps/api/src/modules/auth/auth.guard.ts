import type { CanActivate, ExecutionContext } from '@nestjs/common';
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AuthService } from './auth.service';
import type { AuthSession, AuthenticatedRequest } from './auth.types';
import { IS_PUBLIC_KEY } from './decorators';

/**
 * Global authentication guard (ADR-0006, requirements.md §5.1): every Nest
 * route requires a verified server-side session unless explicitly marked
 * `@Public()` — the allowlist is opt-in and reviewable, never a default.
 *
 * The session is resolved from the request's session cookie through Better
 * Auth; identity is attached to the request for controllers/decorators.
 * Infrastructure failures fail closed with 503 (never a misleading 401 and
 * never a bypass); nothing about headers, cookies, or sessions is logged.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    let session: AuthSession | null;
    try {
      session = await this.authService.getSession(request.headers);
    } catch {
      // Database unavailable, malformed session store, …: refuse the request
      // but do not pretend there is no session. Header/cookie values are
      // credential material and are never logged.
      this.logger.error('Session lookup failed; request refused (database unavailable?).');
      throw new ServiceUnavailableException('Authentication is temporarily unavailable.');
    }

    if (!session) {
      throw new UnauthorizedException('Authentication required.');
    }

    request.auth = session;
    return true;
  }
}
