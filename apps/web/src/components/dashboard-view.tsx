'use client';

import Link from 'next/link';
import { useCallback } from 'react';
import {
  DASHBOARD_WIDGET_IDS,
  type DashboardWidgetId,
  type DashboardWidgetPreference,
} from '@moneyflow/contracts';

import { Card } from '@/components/card';
import { CategoryBars } from '@/components/category-bars';
import { DashboardGoalsCard } from '@/components/dashboard-goals-card';
import { ExpenseIcon, IncomeIcon } from '@/components/icons';
import { StatCard } from '@/components/stat-card';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { TransactionList } from '@/components/transaction-list';
import { fetchDashboard, fetchDashboardLayout } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/locale-context';
import { formatBdtMinor } from '@/lib/money-format';
import { categoryBarData, formatPeriodLabel, recentTransactionRows } from '@/lib/summary-display';
import { useAsyncData } from '@/lib/use-async-data';

/** Documented default order/visibility, shared with the API contract. */
function defaultWidgets(): DashboardWidgetPreference[] {
  return DASHBOARD_WIDGET_IDS.map((id) => ({ id, visible: true }));
}

const WIDGET_CLASS: Record<DashboardWidgetId, string> = {
  totalBalance: 'mf-dashboard-widget--balance',
  income: 'mf-dashboard-widget--kpi',
  expense: 'mf-dashboard-widget--kpi',
  recentTransactions: 'mf-dashboard-widget--half',
  spendingByCategory: 'mf-dashboard-widget--half',
  goals: 'mf-dashboard-widget--half',
  budgets: 'mf-dashboard-widget--half',
};

/**
 * Dashboard widget area (IT-8, customization in IT-11). Every figure comes
 * verbatim from `GET /api/v1/dashboard` — the server computes balances,
 * totals, and percentages (accounting-rules.md §9); this component only
 * formats and lays them out, and never invents a figure or a trend (§5.6).
 *
 * Widget order and visibility come from `GET /api/v1/dashboard/layout`.
 * A missing/failed layout falls back to the documented default so a layout
 * problem can never hide the user's financial data. Hidden widgets are
 * omitted; an all-hidden layout shows a way back to customization.
 */
export function DashboardView() {
  const { t, preferences } = useLocale();
  const load = useCallback(() => fetchDashboard(), []);
  const { state, retry } = useAsyncData(load);
  const loadLayout = useCallback(() => fetchDashboardLayout(), []);
  const layout = useAsyncData(loadLayout);

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
  const periodLabel = formatPeriodLabel(data.period, preferences);
  const rows = recentTransactionRows(data.recentTransactions, data.period.timezone, preferences);
  const categories = categoryBarData(data.spendingByCategory, preferences);
  const widgets = layout.state.status === 'ready' ? layout.state.data.widgets : defaultWidgets();
  const visibleWidgets = widgets.filter((widget) => widget.visible);

  function renderWidget(id: DashboardWidgetId) {
    switch (id) {
      case 'totalBalance':
        return (
          <div className="mf-hero-card">
            <p className="mf-hero-card__label">{t('dashboard.totalBalance')}</p>
            <p className="mf-hero-card__amount">
              {formatBdtMinor(data.totalTrackedBalanceMinor, preferences)}
            </p>
            <p className="mf-hero-card__meta">
              {t('dashboard.totalBalanceMeta', { count: data.activeAccountCount })}
            </p>
          </div>
        );
      case 'income':
        return (
          <StatCard
            label={t('dashboard.incomeThisMonth')}
            amountText={formatBdtMinor(data.totals.incomeMinor, preferences)}
            context={periodLabel}
            icon={<IncomeIcon />}
            tone="income"
          />
        );
      case 'expense':
        return (
          <StatCard
            label={t('dashboard.spentThisMonth')}
            amountText={formatBdtMinor(data.totals.expenseMinor, preferences)}
            context={periodLabel}
            icon={<ExpenseIcon />}
            tone="expense"
          />
        );
      case 'recentTransactions':
        return (
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
        );
      case 'spendingByCategory':
        return (
          <Card title={t('dashboard.categoriesTitle')} subtitle={t('dashboard.categoriesSubtitle')}>
            {categories.length > 0 ? (
              <CategoryBars
                categories={categories}
                periodLabel={periodLabel}
                totalText={formatBdtMinor(data.totals.expenseMinor, preferences)}
              />
            ) : (
              <div className="mf-empty">
                <p className="mf-empty__title">{t('dashboard.categoriesEmpty')}</p>
              </div>
            )}
          </Card>
        );
      case 'goals':
        return <DashboardGoalsCard />;
      case 'budgets':
        return (
          <Card
            title={t('dashboard.budgetsTitle')}
            subtitle={t('dashboard.budgetsSubtitle')}
            action={
              <Link className="mf-card__action" href="/app/budgets">
                {t('common.manage')}
              </Link>
            }
          >
            <p className="mf-empty__text">{t('dashboard.budgetsPlaceholder')}</p>
          </Card>
        );
    }
  }

  return (
    <>
      <div className="mf-summary-meta">
        <p className="mf-chart-note">
          {t('dashboard.periodNote', { period: periodLabel, timezone: data.period.timezone })}
        </p>
        <p className="mf-period-chip">{periodLabel}</p>
      </div>

      {visibleWidgets.length === 0 ? (
        <div className="mf-empty">
          <p className="mf-empty__title">All dashboard widgets are hidden.</p>
          <p className="mf-empty__text">
            Your financial data is still recorded. Turn widgets back on to see it here.
          </p>
          <Link className="mf-btn mf-btn--primary" href="/app/customize">
            Customize dashboard
          </Link>
        </div>
      ) : (
        <div className="mf-dashboard-grid">
          {visibleWidgets.map((widget) => (
            <section
              key={widget.id}
              data-widget={widget.id}
              className={`mf-dashboard-widget ${WIDGET_CLASS[widget.id]}`}
            >
              {renderWidget(widget.id)}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
