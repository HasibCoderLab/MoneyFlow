import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Shared ESLint flat config for all MoneyFlow workspace packages.
 *
 * Consumers: `import base from '@moneyflow/config/eslint';` then spread
 * the array into their own `eslint.config.mjs`.
 */
export default tseslint.config(
  // Global ignores (applies regardless of where the base is imported).
  {
    ignores: [
      '**/dist/**',
      '**/.next/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/next-env.d.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  // Must stay last: disables formatting rules that conflict with Prettier.
  prettier,
);
