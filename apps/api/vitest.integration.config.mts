import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * Integration tests: real PostgreSQL only (ADR-0007, IT-2) — required
 * database behavior is never mocked. Excluded from the default
 * `vitest run` (see vitest.config.mts) so the unit suite and CI's checks
 * job stay database-free.
 *
 * Requires `TEST_DATABASE_URL` pointing at localhost (the harness refuses
 * any other host) and applies committed migrations through globalSetup
 * before the first suite runs.
 */
export default defineConfig({
  plugins: [swc.vite()],
  test: {
    environment: 'node',
    include: ['test/integration/**/*.test.ts'],
    globalSetup: ['test/integration/global-setup.ts'],
    restoreMocks: true,
    testTimeout: 15_000,
    hookTimeout: 120_000,
    // The integration database is one shared resource: suites must not
    // truncate tables while another suite is mid-test. Files run serially.
    fileParallelism: false,
  },
});
