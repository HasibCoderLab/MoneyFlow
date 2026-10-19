import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { I18nText } from '@/components/i18n-text';
import { ReportsView } from '@/components/reports-view';

export const metadata: Metadata = {
  title: 'Reports — MoneyFlow',
  description: 'Recorded income, spending, and category totals — real figures from your account.',
};

/**
 * Reports route (requirements.md §4.3, §5.10). The view renders the IT-8
 * report endpoints: period totals, a sparse daily/weekly/monthly series,
 * and the category breakdown — all computed server-side from recorded
 * transactions. CSV export stays disabled until the export work lands.
 */
export default function ReportsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="reports.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="reports.subtitle" />
          </p>
        </div>
      </header>

      <ReportsView />

      <Card
        title={<I18nText k="reports.moreTitle" />}
        subtitle={<I18nText k="reports.moreSubtitle" />}
      >
        <ul className="mf-report-list">
          <li>
            <I18nText k="reports.moreSeries" />
          </li>
          <li>
            <I18nText k="reports.moreBudgets" />
          </li>
          <li>
            <I18nText k="reports.moreExports" />
          </li>
        </ul>
      </Card>
    </AppShell>
  );
}
