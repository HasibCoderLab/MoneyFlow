import { execSync } from 'node:child_process';

import { getTestDatabaseUrl } from './harness';

/**
 * Vitest global setup for the integration suite: validates the
 * non-local-host guard and applies the committed migrations
 * (`prisma migrate deploy`) to the guarded test database before any suite
 * runs. On a fresh database this *is* the migration replay; CI always
 * starts from the `postgres:16` service container's empty database.
 */
export default function globalSetup(): void {
  const url = getTestDatabaseUrl();

  // The Prisma CLI loads prisma.config.ts, which reads DIRECT_URL first —
  // point both variables at the guarded test database for this child
  // process only, never for the shell.
  try {
    execSync('pnpm exec prisma migrate deploy', {
      stdio: 'pipe',
      timeout: 120_000,
      env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url },
    });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? '';
    throw new Error(`prisma migrate deploy failed against the test database:\n${stderr}`, {
      cause: error,
    });
  }
}
