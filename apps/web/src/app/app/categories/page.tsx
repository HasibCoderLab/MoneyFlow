import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { CategoriesView } from '@/components/categories-view';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Categories — MoneyFlow',
  description: 'Your income, expense, and archived categories — real taxonomy from your account.',
};

/**
 * Categories route (requirements.md §4.3, §5.5). Per decision D5, the page
 * moved from mock data to the IT-5 API in this IT-8 wiring pass: real
 * taxonomy via `GET /api/v1/categories?includeArchived=true`, grouped and
 * read-only — creation stays disabled until the CRUD UI work.
 */
export default function CategoriesPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="categories.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="categories.subtitle" />
          </p>
        </div>
      </header>

      <CategoriesView />
    </AppShell>
  );
}
