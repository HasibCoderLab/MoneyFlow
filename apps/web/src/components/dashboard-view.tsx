'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { Card } from '@/components/card';
import { CategoryBars } from '@/components/category-bars';
import { ExpenseIcon, IncomeIcon } from '@/components/icons';
import { StatCard } from '@/components/stat-card';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { TransactionList } from '@/components/transaction-list';
import { fetchDashboard } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/locale-context';
import { formatBdtMinor } from '@/lib/money-format';
import { categoryBarData, formatPeriodLabel, recentTransactionRows } from '@/lib/summary-display';
import { useAsyncData } from '@/lib/use-async-data';

/**
 * Dashboard widget area (IT-8). Every figure comes verbatim from
 * `GET /api/v1/dashboard` — the server computes balances, totals, and
 * percentages (accounting-rules.md §9); this component only formats and
 * lays them out, and never invents a figure or a trend (§5.6).
 */
export function DashboardView() {
  const { t } = useLocale();
  const load = useCallback(() => fetchDashboard(), []);
  const { state, retry } = useAsyncData(load);

  if (state.status === 'loading') {
    return <SummaryLoading />;
  }
  if (state.status === 'signedOut') {
    return <SummarySignedOut />;
  }
  if (state.status === 'error') {
    return <SummaryError onRetry={retry} />;
  }

  const data = state.data;
  const periodLabel = formatPeriodLabel(data.period);
  const rows = recentTransactionRows(data.recentTransactions, data.period.timezone);
  const categories = categoryBarData(data.spendingByCategory);

  return (
    <>
      <div className="mf-summary-meta">
        <p className="mf-chart-note">
          {t('dashboard.periodNote', { period: periodLabel, timezone: data.period.timezone })}
        </p>
        <p className="mf-period-chip">{periodLabel}</p>
      </div>

      <div className="mf-dashboard-hero">
        <div className="mf-hero-card">
          <p className="mf-hero-card__label">{t('dashboard.totalBalance')}</p>
          <p className="mf-hero-card__amount">{formatBdtMinor(data.totalTrackedBalanceMinor)}</p>
          <p className="mf-hero-card__meta">
            {t('dashboard.totalBalanceMeta', { count: data.activeAccountCount })}
          </p>
        </div>

        <StatCard
          label={t('dashboard.incomeThisMonth')}
          amountText={formatBdtMinor(data.totals.incomeMinor)}
          context={periodLabel}
          icon={<IncomeIcon />}
          tone="income"
        />
        <StatCard
          label={t('dashboard.spentThisMonth')}
          amountText={formatBdtMinor(data.totals.expenseMinor)}
          context={periodLabel}
          icon={<ExpenseIcon />}
          tone="expense"
        />
      </div>

      <div className="mf-dashboard-columns">
        <Card
          title={t('dashboard.recentTitle')}
          subtitle={t('dashboard.recentSubtitle')}
          action={
            <Link className="mf-card__action" href="/app/transactions">
              {t('common.viewAll')}
            </Link>
          }
        >
          {rows.length > 0 ? (
            <TransactionList transactions={rows} />
          ) : (
            <div className="mf-empty">
              <p className="mf-empty__title">{t('dashboard.recentEmpty')}</p>
            </div>
          )}
          <p className="mf-chart-note">{t('dashboard.transferNote')}</p>
        </Card>

        <Card title={t('dashboard.categoriesTitle')} subtitle={t('dashboard.categoriesSubtitle')}>
          {categories.length > 0 ? (
            <CategoryBars
              categories={categories}
              periodLabel={periodLabel}
              totalText={formatBdtMinor(data.totals.expenseMinor)}
            />
          ) : (
            <div className="mf-empty">
              <p className="mf-empty__title">{t('dashboard.categoriesEmpty')}</p>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
