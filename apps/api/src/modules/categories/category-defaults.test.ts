import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_CATEGORY_DEFINITIONS, ensureDefaultCategories } from './category-defaults';
import { toCategoryNameKey } from './name-key';

/**
 * Seed-list and clone-helper tests (IT-5). The clone's real database
 * behavior (unique index, skipDuplicates) is covered by
 * `test/integration/categories.test.ts`; here the client is a mock.
 */

type CloneClient = Parameters<typeof ensureDefaultCategories>[0];

function mockClient(existing: { id: string } | null, count = DEFAULT_CATEGORY_DEFINITIONS.length) {
  const category = {
    findFirst: vi.fn().mockResolvedValue(existing),
    createMany: vi.fn().mockResolvedValue({ count }),
  };
  return { client: { category } as unknown as CloneClient, category };
}

describe('DEFAULT_CATEGORY_DEFINITIONS', () => {
  it('is the owner-approved list: 8 categories, valid colours, unique keys per type', () => {
    expect(
      DEFAULT_CATEGORY_DEFINITIONS.map((definition) => [definition.name, definition.type]),
    ).toEqual([
      ['Salary', 'INCOME'],
      ['Freelance', 'INCOME'],
      ['Gifts', 'INCOME'],
      ['Groceries', 'EXPENSE'],
      ['Transport', 'EXPENSE'],
      ['Food & dining', 'EXPENSE'],
      ['Utilities', 'EXPENSE'],
      ['Other expense', 'EXPENSE'],
    ]);
    for (const definition of DEFAULT_CATEGORY_DEFINITIONS) {
      expect(definition.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(definition.name.length).toBeGreaterThan(0);
      expect(definition.name.length).toBeLessThanOrEqual(60);
    }
    const keys = DEFAULT_CATEGORY_DEFINITIONS.map(
      (definition) => `${definition.type}:${toCategoryNameKey(definition.name)}`,
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('ensureDefaultCategories', () => {
  it('clones the seed with computed name keys and duplicate skipping when the user has none', async () => {
    const { client, category } = mockClient(null);
    const seeded = await ensureDefaultCategories(client, 'user-1');

    expect(seeded).toBe(true);
    expect(category.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: { id: true },
    });
    const data = category.createMany.mock.calls[0]?.[0] as {
      data: Array<Record<string, unknown>>;
      skipDuplicates: boolean;
    };
    expect(data.skipDuplicates).toBe(true);
    expect(data.data).toHaveLength(DEFAULT_CATEGORY_DEFINITIONS.length);
    expect(data.data[0]).toEqual({
      userId: 'user-1',
      name: 'Salary',
      nameKey: 'salary',
      type: 'INCOME',
      color: '#15803d',
    });
  });

  it('never re-seeds when any row exists — archived categories count as existing', async () => {
    const { client, category } = mockClient({ id: 'existing' });
    const seeded = await ensureDefaultCategories(client, 'user-1');

    expect(seeded).toBe(false);
    expect(category.createMany).not.toHaveBeenCalled();
  });

  it('reports false when a concurrent caller already inserted every row', async () => {
    const { client } = mockClient(null, 0);
    await expect(ensureDefaultCategories(client, 'user-1')).resolves.toBe(false);
  });
});

describe('toCategoryNameKey', () => {
  it('trims and lowercases so duplicates are caught case-insensitively', () => {
    expect(toCategoryNameKey('  Food & Dining  ')).toBe('food & dining');
  });
});
