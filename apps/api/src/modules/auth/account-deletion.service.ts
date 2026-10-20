import { HttpException, Injectable, UnauthorizedException } from '@nestjs/common';

import { RateLimiter } from '../../common/rate-limit';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from './auth.types';
import { parseDeleteAccountInput } from './deletion';
import { verifyPassword } from './password';

/** Failed-attempt budget approved in ADR-0011. */
export const DELETION_ATTEMPT_LIMIT = 5;
export const DELETION_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Self-service deletion of the authenticated MoneyFlow user (IT-12,
 * ADR-0011). This is deliberately *not* deletion of a financial `Account`
 * row: financial accounts stay archive-only.

 * Security properties:
 * - identity is the verified session's user; the body cannot name a user;
 * - the current credential is verified with the existing Argon2id hasher;
 * - wrong passwords are rate-limited per user in this single-instance MVP;
 * - every owned row is removed in one database transaction in dependency
 *   order; any failure rolls the whole deletion back;
 * - the `USER_ACCOUNT_DELETED` audit row is written in the same transaction
 *   and its `userId` becomes NULL when the user row is removed;
 * - sessions are removed, so the stale browser cookie can never authenticate
 *   again. Backups are not claimed to be erased (DR-15 remains unresolved).
 */
@Injectable()
export class AccountDeletionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly rateLimiter: RateLimiter,
  ) {}

  public async deleteAccount(user: AuthUser, body: unknown): Promise<void> {
    const input = parseDeleteAccountInput(body);

    if (
      !this.rateLimiter.consume(
        `account-deletion:${user.id}`,
        DELETION_ATTEMPT_LIMIT,
        DELETION_ATTEMPT_WINDOW_MS,
      )
    ) {
      throw new HttpException('Too many deletion attempts. Try again later.', 429);
    }

    const credential = await this.prisma.authAccount.findFirst({
      where: { userId: user.id, providerId: 'credential' },
      select: { password: true },
    });
    const passwordMatches =
      credential?.password !== null &&
      credential?.password !== undefined &&
      (await verifyPassword({ hash: credential.password, password: input.password }));

    if (!passwordMatches) {
      // Generic copy: an authenticated caller learns nothing about whether a
      // credential row exists or why verification failed.
      throw new UnauthorizedException('Current password is incorrect.');
    }

    await this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: { email: true },
      });
      if (!current) {
        // The account disappeared after the session was resolved. Fail closed
        // rather than reporting a deletion that this request did not perform.
        throw new UnauthorizedException('Authentication required.');
      }

      // Dependency order mirrors ADR-0011: children before parents, because
      // financial FKs are deliberately NO ACTION rather than CASCADE.
      await tx.goalContribution.deleteMany({ where: { userId: user.id } });
      await tx.goal.deleteMany({ where: { userId: user.id } });
      await tx.budgetCategoryLimit.deleteMany({ where: { budget: { userId: user.id } } });
      await tx.budget.deleteMany({ where: { userId: user.id } });
      await tx.transaction.deleteMany({ where: { userId: user.id } });
      await tx.category.deleteMany({ where: { userId: user.id } });
      await tx.account.deleteMany({ where: { userId: user.id } });
      await tx.userPreference.deleteMany({ where: { userId: user.id } });
      await tx.dashboardLayout.deleteMany({ where: { userId: user.id } });

      // Verification rows are keyed by the email identifier, not by userId.
      const emailIdentifiers = [...new Set([current.email, current.email.toLowerCase()])];
      await tx.verification.deleteMany({ where: { identifier: { in: emailIdentifiers } } });

      // Removing sessions is the server-side revocation; deleting the user is
      // the final step so a partial failure can never strand half an account.
      await tx.session.deleteMany({ where: { userId: user.id } });
      await tx.authAccount.deleteMany({ where: { userId: user.id } });

      await this.audit.recordInTransaction(tx, {
        userId: user.id,
        type: 'USER_ACCOUNT_DELETED',
        resourceType: 'user',
        metadata: { reason: 'self_service' },
      });

      await tx.user.delete({ where: { id: user.id } });
    });
  }
}
