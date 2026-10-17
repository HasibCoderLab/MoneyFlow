import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { API_BASE_PATH, AUTH_BASE_PATH } from '@moneyflow/contracts';
import { toNodeHandler } from 'better-auth/node';

import { parseCorsOrigins } from './config/cors';
import { AppModule } from './app.module';
import { AUTH_INSTANCE, type AuthInstance } from './modules/auth/auth.tokens';

/**
 * Shared application bootstrap used by `main.ts` and the integration tests,
 * so tests exercise exactly the production wiring (global prefix, CORS,
 * Better Auth mount).
 *
 * No environment validation here: callers call `validateEnv` first
 * (main.ts fails fast before the Nest container is built).
 */
export async function createApiApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  // All REST endpoints are versioned under /api/v1 (requirements.md §8.5).
  app.setGlobalPrefix(API_BASE_PATH);

  configureCors(app);
  mountAuthHandler(app);

  return app;
}

function configureCors(app: INestApplication): void {
  const origins = parseCorsOrigins(process.env.CORS_ORIGINS);
  if (origins.length === 0) {
    // No origins configured means no cross-origin browser access.
    return;
  }
  app.enableCors({
    origin: origins,
    // Session-cookie requests from the web app (different origin in
    // development) require credentialed CORS for the allowlisted origins.
    credentials: true,
  });
}

/**
 * Serves Better Auth's own HTTP endpoints (POST /sign-up/email,
 * POST /sign-in/email, POST /sign-out, GET /get-session, …) under
 * `/api/v1/auth` (ADR-0006).
 *
 * `app.use()` runs before `listen()`/`init()`, which is what puts this
 * handler in front of Nest's body parsers and router: Better Auth reads the
 * raw request stream, and its endpoints intentionally bypass Nest guards —
 * they are the public authentication surface itself. Responses use Better
 * Auth's JSON/error format; every other route stays on the Nest error
 * contract.
 */
export function mountAuthHandler(app: INestApplication): void {
  const auth = app.get<AuthInstance>(AUTH_INSTANCE);
  app.use(AUTH_BASE_PATH, toNodeHandler(auth));
}
