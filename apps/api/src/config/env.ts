/**
 * Startup environment validation (requirements.md §14).
 *
 * - Fails fast on invalid values before the HTTP server starts.
 * - Requires secrets/connection strings in production only, so local
 *   development can run without a database configured.
 * - Never logs environment values: they may contain credentials.
 */

import { parseCorsOrigins } from './cors';

/** Better Auth requires a high-entropy secret; 32 characters is the floor. */
const MIN_BETTER_AUTH_SECRET_LENGTH = 32;

function parsePort(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error('Invalid environment: PORT must be a positive integer.');
  }
  const port = Number(value);
  if (port < 1 || port > 65535) {
    throw new Error('Invalid environment: PORT must be between 1 and 65535.');
  }
  return port;
}

function parseHttpUrl(value: string, name: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid environment: ${name} must be a valid URL.`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Invalid environment: ${name} must use http or https.`);
  }
  return url;
}

export interface ValidatedEnv {
  port: number;
}

export function validateEnv(env: NodeJS.ProcessEnv): ValidatedEnv {
  const port = parsePort(env.PORT ?? '4000');

  const isProduction = env.NODE_ENV === 'production';

  if (isProduction && !env.DATABASE_URL) {
    throw new Error('Invalid environment: DATABASE_URL is required in production.');
  }

  // Better Auth secret: optional outside production (the library falls back
  // to a documented development default), but whenever it is set it must be
  // long enough to be meaningful. Production must never rely on the default.
  // A blank value (e.g. an unfilled placeholder line in `.env`) means unset.
  const betterAuthSecret = env.BETTER_AUTH_SECRET?.trim();
  if (betterAuthSecret && betterAuthSecret.length < MIN_BETTER_AUTH_SECRET_LENGTH) {
    throw new Error(
      `Invalid environment: BETTER_AUTH_SECRET must be at least ${MIN_BETTER_AUTH_SECRET_LENGTH} characters.`,
    );
  }
  if (isProduction && !betterAuthSecret) {
    throw new Error('Invalid environment: BETTER_AUTH_SECRET is required in production.');
  }

  // Public API URL used for auth callbacks, origin checks, and cookie
  // security. Optional locally; in production it is required and must be
  // https so session cookies are issued with the Secure attribute.
  if (env.BETTER_AUTH_URL !== undefined && env.BETTER_AUTH_URL !== '') {
    const authUrl = parseHttpUrl(env.BETTER_AUTH_URL, 'BETTER_AUTH_URL');
    if (isProduction && authUrl.protocol !== 'https:') {
      throw new Error('Invalid environment: BETTER_AUTH_URL must be https in production.');
    }
  }
  if (isProduction && !env.BETTER_AUTH_URL) {
    throw new Error('Invalid environment: BETTER_AUTH_URL is required in production.');
  }

  // Google Sign-In is optional until owner-provided credentials exist; a
  // half-configured provider is always a mistake (ADR-0006, IT-3 scope).
  const hasGoogleClientId = Boolean(env.GOOGLE_CLIENT_ID);
  const hasGoogleClientSecret = Boolean(env.GOOGLE_CLIENT_SECRET);
  if (hasGoogleClientId !== hasGoogleClientSecret) {
    throw new Error(
      'Invalid environment: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set together or not at all.',
    );
  }

  // Empty string means "CORS disabled"; a whitespace-only value is a mistake.
  if (env.CORS_ORIGINS !== undefined && env.CORS_ORIGINS !== '' && env.CORS_ORIGINS.trim() === '') {
    throw new Error('Invalid environment: CORS_ORIGINS must be a comma-separated list of origins.');
  }

  // The same list feeds the CORS middleware and Better Auth's trusted-origin
  // (CSRF) check. The middleware only exact-matches string origins, while
  // Better Auth treats `*`/`?` as wildcards — a wildcard entry would weaken
  // the origin check without ever enabling CORS, so exact origins are required.
  const corsOrigins = parseCorsOrigins(env.CORS_ORIGINS);
  if (corsOrigins.some((origin) => origin.includes('*') || origin.includes('?'))) {
    throw new Error(
      'Invalid environment: CORS_ORIGINS entries must be exact origins (no wildcards).',
    );
  }

  return { port };
}
