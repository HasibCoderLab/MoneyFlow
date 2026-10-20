import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Mirror the `@/*` path alias from tsconfig.json so tests resolve the
  // same imports as Next.js and tsc.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Next.js requires `jsx: "preserve"` in tsconfig.json; tests must still
  // transform JSX, so the oxc transform is set to the automatic runtime.
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'jsdom',
    // Lets @testing-library/react auto-register its afterEach cleanup so
    // rendered DOM does not leak between tests (globals stay importable).
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
    // Full-repo runs execute the API suite in parallel; jsdom interaction tests
    // can exceed the 5s default under that CPU contention without being hung.
    testTimeout: 15_000,
  },
});
