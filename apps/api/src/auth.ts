import { betterAuth } from 'better-auth';

import { PrismaClient } from './generated/prisma/client';
import { createAuthOptions } from './modules/auth/auth-options';
import { buildPrismaClientOptions } from './prisma/prisma-client-options';

/**
 * Better Auth instance for the official `auth` CLI (`auth generate`,
 * `auth check schema`) — the schema-generation input described in
 * docs/runbooks/local-development.md.
 *
 * The Nest API builds its runtime instance from the same
 * `createAuthOptions` factory inside `AuthModule` (`src/modules/auth/
 * auth.module.ts`) on top of the shared `PrismaService`, so CLI checks and
 * runtime behavior can never drift apart. Email/password with Argon2id
 * hooks, session lifetime, rate limiting, trusted origins, and cookie
 * security are configured there (ADR-0006).
 *
 * The auth credential table is renamed to `authAccount` so it cannot
 * collide with the financial `Account` model (ADR-0006 decision 10).
 */
const prisma = new PrismaClient(buildPrismaClientOptions(process.env.DATABASE_URL));

export const auth = betterAuth(createAuthOptions({ prisma, env: process.env }));
