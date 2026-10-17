import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { Button } from '@/components/ui/button';
import { MOCK_CATEGORIES } from '@/lib/mock-data';
import type { MockCategory } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Categories — MoneyFlow UI preview',
};

function CategoryGroup({
  title,
  subtitle,
  categories,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly categories: readonly MockCategory[];
}) {
  return (
    <Card title={title} subtitle={subtitle}>
      <ul className="mf-category-list">
        {categories.map((category) => (
          <li key={category.id} className="mf-category">
            <span
              className="mf-category__dot"
              style={{ backgroundColor: category.color }}
              aria-hidden="true"
            />
            <span>{category.name}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/**
 * Categories route (requirements.md §4.3, §5.5). Layout preview only: sample
 * default income/expense categories plus one archived row. Color dots are
 * decoration — the name carries the meaning, never color alone. Custom
 * categories, renaming, deletion safeguards, and reassignment arrive with
 * the categories API (IT-5); creation stays disabled until then.
 */
export default function CategoriesPage() {
  const income = MOCK_CATEGORIES.filter(
    (category) => category.kind === 'income' && category.status === 'active',
  );
  const expenses = MOCK_CATEGORIES.filter(
    (category) => category.kind === 'expense' && category.status === 'active',
  );
  const archived = MOCK_CATEGORIES.filter((category) => category.status === 'archived');

  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Categories</h1>
          <p className="mf-page-header__subtitle">
            Labels that explain where money comes from and goes — sample set for this preview.
          </p>
        </div>
        <Button disabled aria-disabled="true" title="Category creation connects with IT-5">
          New category
        </Button>
      </header>

      <div className="mf-dashboard-columns">
        <CategoryGroup title="Income" subtitle="Sample defaults" categories={income} />
        <CategoryGroup title="Expenses" subtitle="Sample defaults" categories={expenses} />
      </div>

      <Card title="Archived" subtitle="History stays readable">
        <ul className="mf-category-list">
          {archived.map((category) => (
            <li key={category.id} className="mf-category">
              <span
                className="mf-category__dot"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              <span>{category.name} · Archived</span>
            </li>
          ))}
        </ul>
        <p className="mf-chart-note">
          A category with past transactions cannot vanish: it is archived or its records are
          reassigned first, so old reports keep making sense.
        </p>
      </Card>
    </AppShell>
  );
}
