import { AUTH_BASE_PATH } from '@moneyflow/contracts';
import type { BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { parseCorsOrigins } from '../../config/cors';
import type { PrismaClient } from '../../generated/prisma/client';
import { hashPassword, verifyPassword } from './password';

/**
 * Builds the Better Auth options for the email/password MVP (ADR-0006,
 * docs/architecture/auth-sessions.md). Pure input→options mapping so the
 * security-relevant configuration is unit-testable without a database.
 *
 * - Email/password with Argon2id hooks; 12–128 character passwords, no
 *   composition rules (ADR-0006 decision 4). Email verification stays
 *   disabled until a mail provider exists (documented launch gate).
 * - Database-backed sessions: 30-day absolute lifetime, daily refresh.
 * - Rate limiting enabled in every environment (Better Auth keyed by IP +
 *   path; in-memory storage suits the single-instance MVP).
 * - Cookies: HttpOnly, SameSite=Lax, `Secure` whenever the public API URL is
 *   https (production requires https in `validateEnv`).
 * - Google Sign-In is configured only when owner-provided credentials exist;
 *   `validateEnv` rejects half-configured pairs.
 */
export interface CreateAuthOptionsInput {
  prisma: PrismaClient;
  env: NodeJS.ProcessEnv;
}

/** 30 days in seconds (ADR-0006 decision 3). */
export const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 30;
/** Refresh a session when it is used and older than one day. */
export const SESSION_REFRESH_SECONDS = 60 * 60 * 24;

/** ADR-0006 decision 4: minimum 12 characters, no forced composition rules. */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export function createAuthOptions({ prisma, env }: CreateAuthOptionsInput): BetterAuthOptions {
  const baseURL = authBaseUrl(env);
  const googleClientId = env.GOOGLE_CLIENT_ID;
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET;

  return {
    appName: 'MoneyFlow',
    baseURL,
    basePath: AUTH_BASE_PATH,
    // Falls back to the library's documented development default when
    // unset/blank; production requires a real secret in `validateEnv`.
    secret: env.BETTER_AUTH_SECRET?.trim() || undefined,
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    // The credential table is named `authAccount` so it cannot collide with
    // the financial `Account` model (ADR-0006 decision 10).
    account: { modelName: 'authAccount' },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: MAX_PASSWORD_LENGTH,
      password: {
        hash: hashPassword,
        verify: verifyPassword,
      },
      // Email verification is deferred (ADR-0006 decision 8): sign-in must
      // not silently require an email flow that does not exist yet. Shipping
      // it is an explicit launch gate, never a silent default change.
      requireEmailVerification: false,
    },
    session: {
      expiresIn: SESSION_LIFETIME_SECONDS,
      updateAge: SESSION_REFRESH_SECONDS,
    },
    // Enabled in every environment so development, tests, and production
    // exercise the same protection (Better Auth's built-in sign-in/sign-up
    // rules apply automatically). In-memory storage: acceptable for the
    // single-API-instance MVP; horizontal scaling needs a shared store.
    rateLimit: { enabled: true, storage: 'memory' },
    // Browsers served by the web app are allowed to send cookie-authenticated
    // cross-origin requests; Better Auth also validates the `Origin` header of
    // state-changing requests against this list (the API's own origin is
    // always trusted).
    trustedOrigins: parseCorsOrigins(env.CORS_ORIGINS),
    ...(googleClientId && googleClientSecret
      ? {
          socialProviders: {
            google: { clientId: googleClientId, clientSecret: googleClientSecret },
          },
        }
      : {}),
    advanced: {
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      },
      // `Secure` whenever the public API URL is https. Locally (http) the
      // flag would make browsers drop the cookie.
      useSecureCookies: baseURL.startsWith('https://'),
      // Better Auth disables the Origin/CSRF gate whenever `isTest()` is
      // true (`NODE_ENV=test` or `TEST=true`) — and vitest sets
      // `NODE_ENV=test`. Pin the checks ON so development, tests, and
      // production all enforce them; the integration suite depends on this.
      disableOriginCheck: false,
    },
  };
}

function authBaseUrl(env: NodeJS.ProcessEnv): string {
  const configured = env.BETTER_AUTH_URL?.trim();
  if (configured) {
    return configured;
  }
  return `http://localhost:${env.PORT ?? '4000'}`;
}
