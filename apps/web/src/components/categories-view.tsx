'use client';

import { useCallback } from 'react';
import type { CategoryResponse } from '@moneyflow/contracts';

import { Card } from '@/components/card';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { Button } from '@/components/ui/button';
import { fetchCategories } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/locale-context';
import { useAsyncData } from '@/lib/use-async-data';

/** Colour dot is decoration only — the name always carries the meaning (§5.5). */
function CategoryList({ categories }: { readonly categories: readonly CategoryResponse[] }) {
  return (
    <ul className="mf-category-list">
      {categories.map((category) => (
        <li key={category.id} className="mf-category">
          <span
            className="mf-category__dot"
            style={{ backgroundColor: category.color ?? 'var(--mf-border-strong)' }}
            aria-hidden="true"
          />
          <span>{category.name}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Categories view (IT-8 wiring of the IT-5 API, per decision D5): the real
 * taxonomy via `GET /api/v1/categories?includeArchived=true`, grouped into
 * income, expenses, and archived rows — history stays visible. No CRUD UI
 * exists in this build; the disabled action says exactly that.
 */
export function CategoriesView() {
  const { t } = useLocale();
  const load = useCallback(() => fetchCategories(true), []);
  const { state, retry } = useAsyncData(load);

  const toolbar = (
    <div className="mf-summary-meta">
      <Button disabled aria-disabled="true" title={t('categories.newDisabled')}>
        {t('categories.newButton')}
      </Button>
    </div>
  );

  if (state.status === 'loading') {
    return (
      <>
        {toolbar}
        <SummaryLoading />
      </>
    );
  }
  if (state.status === 'signedOut') {
    return (
      <>
        {toolbar}
        <SummarySignedOut />
      </>
    );
  }
  if (state.status === 'error') {
    return (
      <>
        {toolbar}
        <SummaryError onRetry={retry} />
      </>
    );
  }

  const income = state.data.filter(
    (category) => category.status === 'ACTIVE' && category.type === 'INCOME',
  );
  const expenses = state.data.filter(
    (category) => category.status === 'ACTIVE' && category.type === 'EXPENSE',
  );
  const archived = state.data.filter((category) => category.status === 'ARCHIVED');

  if (income.length + expenses.length + archived.length === 0) {
    return (
      <>
        {toolbar}
        <div className="mf-empty">
          <p className="mf-empty__title">{t('categories.empty')}</p>
        </div>
      </>
    );
  }

  return (
    <>
      {toolbar}

      <div className="mf-dashboard-columns">
        {income.length > 0 ? (
          <Card title={t('categories.incomeTitle')} subtitle={t('categories.groupSubtitle')}>
            <CategoryList categories={income} />
          </Card>
        ) : null}
        {expenses.length > 0 ? (
          <Card title={t('categories.expensesTitle')} subtitle={t('categories.groupSubtitle')}>
            <CategoryList categories={expenses} />
          </Card>
        ) : null}
      </div>

      {archived.length > 0 ? (
        <Card title={t('categories.archivedTitle')} subtitle={t('categories.archivedSubtitle')}>
          <CategoryList categories={archived} />
          <p className="mf-chart-note">{t('categories.archivedNote')}</p>
        </Card>
      ) : null}
    </>
  );
}
