import base from '@moneyflow/config/eslint';

export default [
  ...base,
  {
    // Generated Prisma client (fixed output path, gitignored, regenerated
    // by `prisma generate` — see apps/api/prisma/schema.prisma).
    ignores: ['src/generated/**'],
  },
];
