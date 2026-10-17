// Prisma ORM 7 CLI configuration.
//
// Prisma 7 removed `url` from schema.prisma and no longer loads `.env`
// implicitly (https://pris.ly/d/config-datasource). Connection URLs for
// Migrate live here instead, and environment files are loaded explicitly:
// the repo-root `.env` (documented template location) first, then an
// `apps/api/.env` which takes precedence. Values already set in the shell
// are never overridden by either file.
import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

loadEnv({ path: path.resolve(process.cwd(), '../../.env') });
loadEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prefer the direct (non-pooled) connection when the environment
    // provides one — Neon splits pooled/direct endpoints (ADR-0007);
    // otherwise fall back to DATABASE_URL. `||` treats an empty value as
    // unset; a missing value both ways fails fast with PrismaConfigEnvError.
    url: process.env.DIRECT_URL || env('DATABASE_URL'),
  },
});
