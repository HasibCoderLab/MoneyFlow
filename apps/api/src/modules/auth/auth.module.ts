import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { betterAuth } from 'better-auth';

import { RateLimiter } from '../../common/rate-limit';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditModule } from '../audit/audit.module';
import { AccountDeletionService } from './account-deletion.service';
import { createAuthOptions } from './auth-options';
import { AUTH_INSTANCE } from './auth.tokens';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { MeController } from './me.controller';

/**
 * Better Auth integration (ADR-0006, IT-3):
 *
 * - builds the single runtime auth instance from `createAuthOptions` on top
 *   of the shared `PrismaService` (same database, same pool);
 * - exposes the instance for the HTTP mount in `bootstrap.ts`, which serves
 *   Better Auth's own endpoints (sign-up/sign-in/sign-out/get-session) under
 *   `/api/v1/auth` in front of Nest's routing and body parsers;
 * - registers `AuthGuard` globally: protected by default, `@Public()` is the
 *   explicit allowlist;
 * - serves the thin `/me` endpoints.
 *
 * The auth `src/auth.ts` (used by the `auth` CLI for schema checks and
 * generation) builds an identical instance from the same options factory.
 */
@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [MeController],
  providers: [
    {
      provide: AUTH_INSTANCE,
      inject: [PrismaService],
      useFactory: (prisma: PrismaService) =>
        betterAuth(createAuthOptions({ prisma, env: process.env })),
    },
    AuthService,
    AccountDeletionService,
    RateLimiter,
    AuthGuard,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  exports: [AUTH_INSTANCE, AuthService],
})
export class AuthModule {}
