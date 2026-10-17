import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // esbuild/oxc cannot emit `emitDecoratorMetadata`, which NestJS dependency
    // injection requires. SWC compiles tests with full decorator metadata,
    // inferred from tsconfig.json (experimentalDecorators +
    // emitDecoratorMetadata) — see unplugin-swc docs.
    swc.vite(),
  ],
  test: {
    environment: 'node',
    // Database-free unit suite: tests under src/ plus the pure guard test in
    // test/support. Real-PostgreSQL integration tests live in
    // test/integration and run only via vitest.integration.config.mts.
    include: ['src/**/*.test.ts', 'test/support/**/*.test.ts'],
    restoreMocks: true,
  },
});
