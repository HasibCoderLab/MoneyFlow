# ADR-0002: Tooling and version pinning

**Status:** Accepted  
**Date:** 2026-10-15

## Context

The stack must be strict, testable, and maintainable
(`requirements.md` §11.4), and dependency versions must be chosen
deliberately rather than "latest for its own sake"
(§13.2, §13.5).

## Decision

| Concern         | Choice                                                                     | Why                                                                                                                                                               |
| --------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager | pnpm 12 workspaces (`packageManager` pinned)                               | Fast, strict node_modules, workspace filtering                                                                                                                    |
| Language        | TypeScript `~6.0.3`, `strict` + `noUncheckedIndexedAccess`                 | Newest stable line supported by typescript-eslint (peer `<6.1.0`) and pinned by NestJS CLI (`~6.0.2`); TS 7 is excluded until the lint/test toolchain supports it |
| Lint            | ESLint 10 flat config + typescript-eslint, shared from `@moneyflow/config` | One config for all packages; Prettier compatibility via `eslint-config-prettier`                                                                                  |
| Format          | Prettier 3 (root)                                                          | Consistent formatting without per-package drift                                                                                                                   |
| Tests           | Vitest 5 (all packages); SWC transform in the API                          | One runner; esbuild cannot emit `emitDecoratorMetadata`, which NestJS DI requires — `unplugin-swc` closes that gap                                                |
| Frameworks      | Next.js 16, NestJS 12, React 19                                            | Current stable majors of the mandated stack                                                                                                                       |
| ORM             | Prisma 7.10.0 (CLI pinned to a stable release)                             | The `latest` dist-tag pointed at an 8.0.0 RC during setup; RCs are not acceptable for a financial app                                                             |
| Database        | PostgreSQL 16 (local Docker)                                               | Mandated datastore; no other infra                                                                                                                                |

## Consequences

- Upgrading TypeScript to 7.x requires confirming typescript-eslint and
  the NestJS toolchain support it first.
- Prisma migrations are committed; `@prisma/client` is added only when the
  schema (financial domain task) is introduced, so no unused runtime
  dependency exists today.
- CI runs the same commands as local development
  (`lint`, `typecheck`, `test`, `build`).
