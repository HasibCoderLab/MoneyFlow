import { BadRequestException } from '@nestjs/common';
import { DASHBOARD_WIDGET_IDS } from '@moneyflow/contracts';
import { describe, expect, it } from 'vitest';

import { defaultWidgets, normalizeStoredLayout, parseUpdateLayoutInput } from './layout';

/**
 * IT-11 dashboard layout validation (requirements.md §5.6/§5.7):
 * strict writes (every widget exactly once, no unknown fields/ids), a
 * documented default, and defensive read normalization for stale saved data.
 */

function widgets(visible: Partial<Record<(typeof DASHBOARD_WIDGET_IDS)[number], boolean>> = {}) {
  return DASHBOARD_WIDGET_IDS.map((id) => ({ id, visible: visible[id] ?? true }));
}

function expectBadRequest(input: unknown, pattern?: RegExp): void {
  try {
    parseUpdateLayoutInput(input);
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    if (pattern) {
      expect((error as BadRequestException).message).toMatch(pattern);
    }
    return;
  }
  throw new Error('Expected a BadRequestException.');
}

describe('defaultWidgets', () => {
  it('returns every supported widget once, visible, in documented order', () => {
    expect(defaultWidgets()).toEqual(DASHBOARD_WIDGET_IDS.map((id) => ({ id, visible: true })));
  });
});

describe('parseUpdateLayoutInput', () => {
  it('accepts a complete reordered/hidden layout', () => {
    const input = {
      widgets: [
        { id: 'recentTransactions', visible: false },
        { id: 'totalBalance', visible: true },
        { id: 'goals', visible: false },
        { id: 'income', visible: true },
        { id: 'expense', visible: true },
        { id: 'spendingByCategory', visible: true },
        { id: 'budgets', visible: true },
      ],
    };
    expect(parseUpdateLayoutInput(input)).toEqual(input.widgets);
  });

  it('rejects unknown top-level fields', () => {
    expectBadRequest({ widgets: widgets(), userId: 'attacker' }, /Unknown field "userId"/);
  });

  it('rejects a partial list, duplicates, and missing widgets', () => {
    expectBadRequest({ widgets: widgets().slice(0, 3) }, /every supported widget exactly once/);
    const duplicate = [...widgets().slice(0, 6), { id: 'income', visible: true }];
    expectBadRequest({ widgets: duplicate }, /appears more than once/);
    expectBadRequest({ widgets: 'all' }, /must be an array/);
  });

  it('rejects unknown widget ids and unknown per-entry fields', () => {
    expectBadRequest(
      { widgets: [...widgets().slice(0, 6), { id: 'crypto', visible: true }] },
      /not a supported dashboard widget/,
    );
    expectBadRequest(
      {
        widgets: widgets().map((entry, index) => (index === 0 ? { ...entry, height: 2 } : entry)),
      },
      /Unknown field "widgets\[0\]\.height"/,
    );
  });

  it('requires an explicit boolean visibility', () => {
    expectBadRequest(
      {
        widgets: widgets().map((entry, index) =>
          index === 0 ? { id: entry.id, visible: 'yes' } : entry,
        ),
      },
      /visible" must be a boolean/,
    );
  });

  it('rejects non-object bodies and entries', () => {
    expectBadRequest([], /JSON object/);
    expectBadRequest({ widgets: [...widgets().slice(0, 6), null] }, /must be an object/);
  });
});

describe('normalizeStoredLayout', () => {
  it('keeps a valid saved layout unchanged', () => {
    const saved = { version: 1, widgets: [...widgets({ goals: false })].reverse() };
    expect(normalizeStoredLayout(saved)).toEqual(saved.widgets);
  });

  it('drops stale/unknown/duplicate/malformed entries and appends missing widgets', () => {
    const normalized = normalizeStoredLayout({
      version: 1,
      widgets: [
        { id: 'goals', visible: false },
        { id: 'removedWidget', visible: true },
        { id: 'goals', visible: true },
        { id: 'income', visible: 'yes' },
        { id: 'recentTransactions', visible: true },
      ],
    });

    expect(normalized.slice(0, 2)).toEqual([
      { id: 'goals', visible: false },
      { id: 'recentTransactions', visible: true },
    ]);
    expect(normalized).toHaveLength(DASHBOARD_WIDGET_IDS.length);
    expect(new Set(normalized.map((entry) => entry.id))).toEqual(new Set(DASHBOARD_WIDGET_IDS));
    expect(normalized.find((entry) => entry.id === 'totalBalance')).toEqual({
      id: 'totalBalance',
      visible: true,
    });
  });

  it('falls back to the full default for malformed or unsupported versions', () => {
    expect(normalizeStoredLayout(null)).toEqual(defaultWidgets());
    expect(normalizeStoredLayout('layout')).toEqual(defaultWidgets());
    expect(normalizeStoredLayout({ version: 2, widgets: widgets() })).toEqual(defaultWidgets());
    expect(normalizeStoredLayout({ version: 1, widgets: {} })).toEqual(defaultWidgets());
  });
});
