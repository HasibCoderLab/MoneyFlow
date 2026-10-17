import type { CategoryType } from '@moneyflow/contracts';

import type { PrismaClient } from '../../generated/prisma/client';
import { toCategoryNameKey } from './name-key';

/**
 * Default-category cloning (IT-5, requirements.md §5.5, domain-model.md
 * "Category"): every user starts with a sensible set of income/expense
 * categories so the first transaction needs no setup.
 *
 * - Owner-approved list (2026-10-17): the UI preview categories plus an
 *   `Other expense` fallback, with the preview's hex colours. Names and
 *   colours are product data — changes are owner decisions, not code
 *   refactors.
 * - Cloned at sign-up through the Better Auth `databaseHooks.user.create`
 *   hook; `CategoriesService.listCategories` also ensures the defaults on
 *   first read, which backfills users created before IT-5. Both paths are
 *   the same idempotent helper, so they can never drift apart.
 */
export interface DefaultCategoryDefinition {
  readonly name: string;
  readonly type: CategoryType;
  readonly color: string;
}

/** The owner-approved seed list; order is documentation, not behavior. */
export const DEFAULT_CATEGORY_DEFINITIONS: readonly DefaultCategoryDefinition[] = [
  { name: 'Salary', type: 'INCOME', color: '#15803d' },
  { name: 'Freelance', type: 'INCOME', color: '#0369a1' },
  { name: 'Gifts', type: 'INCOME', color: '#7c3aed' },
  { name: 'Groceries', type: 'EXPENSE', color: '#2563eb' },
  { name: 'Transport', type: 'EXPENSE', color: '#06b6d4' },
  { name: 'Food & dining', type: 'EXPENSE', color: '#f59e0b' },
  { name: 'Utilities', type: 'EXPENSE', color: '#be123c' },
  { name: 'Other expense', type: 'EXPENSE', color: '#64748b' },
];

/** The client surface the clone needs; satisfied by PrismaService and tx clients. */
export type CategoryDefaultsClient = Pick<PrismaClient, 'category'>;

/**
 * Idempotently clones the default categories to `userId` and returns whether
 * this call inserted seed rows.
 *
 * - Copies only when the user has no category rows at all. Archived rows
 *   count as existing, so archiving never re-seeds. A user who deletes
 *   *every* category (possible only while no transaction references them)
 *   gets the defaults back on the next read — accepted: the product promise
 *   is that sensible defaults are always available, and there is no marker
 *   column to distinguish "never seeded" from "deleted everything" without
 *   a schema change.
 * - Concurrent callers (parallel first reads, or hook + read) converge:
 *   the unique `(userId, nameKey, type)` index plus `skipDuplicates` means
 *   every racing insert either wins or is skipped, never duplicated.
 */
export async function ensureDefaultCategories(
  client: CategoryDefaultsClient,
  userId: string,
): Promise<boolean> {
  const existing = await client.category.findFirst({
    where: { userId },
    select: { id: true },
  });
  if (existing !== null) {
    return false;
  }
  const { count } = await client.category.createMany({
    data: DEFAULT_CATEGORY_DEFINITIONS.map((definition) => ({
      userId,
      name: definition.name,
      nameKey: toCategoryNameKey(definition.name),
      type: definition.type,
      color: definition.color,
    })),
    skipDuplicates: true,
  });
  return count > 0;
}
