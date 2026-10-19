'use client';

import { useCallback, useId, useState } from 'react';
import type { ReportGranularity } from '@moneyflow/contracts';

import { Card } from '@/components/card';
import { CategoryBars } from '@/components/category-bars';
import { ExpenseIcon, IncomeIcon } from '@/components/icons';
import { StatCard } from '@/components/stat-card';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { Button } from '@/components/ui/button';
import { fetchReportCategories, fetchReportSummary } from '@/lib/api-client';
import { useLocale } from '@/lib/i18n/locale-context';
import { formatBdtMinor } from '@/lib/money-format';
import { categoryBarData, formatPeriodLabel, formatRangeLabel } from '@/lib/summary-display';
import { useAsyncData } from '@/lib/use-async-data';

const GRANULARITIES: readonly ReportGranularity[] = ['daily', 'weekly', 'monthly'];

/**
 * Reports view (IT-8). Totals, the bucketed series, and the category
 * breakdown all come from the report endpoints (`requirements.md` §5.10) —
 * buckets are sparse (days with no qualifying activity are omitted, not
 * drawn as zero) and clipped to the requested period by the API. The
 * granularity control re-queries the series; nothing is derived client-side
 * beyond display formatting.
 */
export function ReportsView() {
  const { t } = useLocale();
  const granularityLabelId = useId();
  const [granularity, setGranularity] = useState<ReportGranularity>('daily');

  const loadSummary = useCallback(() => fetchReportSummary({}, granularity), [granularity]);
  const loadCategories = useCallback(() => fetchReportCategories(), []);
  const summary = useAsyncData(loadSummary);
  const categories = useAsyncData(loadCategories);

  // The chip prefers the summary's period but survives a series reload via
  // the independently loaded category report (same default period).
  const chipPeriod =
    summary.state.status === 'ready'
      ? summary.state.data.period
      : categories.state.status === 'ready'
        ? categories.state.data.period
        : null;
  const chipLabel = chipPeriod ? formatPeriodLabel(chipPeriod) : null;

  if (summary.state.status === 'signedOut') {
    return <SummarySignedOut />;
  }
  if (summary.state.status === 'error') {
    return <SummaryError onRetry={summary.retry} />;
  }

  const toolbar = (
    <div className="mf-report-toolbar">
      <div className="mf-field">
        <span className="mf-field__label" id={granularityLabelId}>
          {t('reports.granularityLabel')}
        </span>
        <div className="mf-segmented" role="group" aria-labelledby={granularityLabelId}>
          {GRANULARITIES.map((option) => (
            <button
              key={option}
              type="button"
              className={`mf-segmented__option${
                option === granularity ? ' mf-segmented__option--active' : ''
              }`}
              aria-pressed={option === granularity}
              onClick={() => setGranularity(option)}
            >
              {t(`reports.granularity.${option}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="mf-report-toolbar__right">
        {chipLabel ? <p className="mf-period-chip">{chipLabel}</p> : null}
        <Button disabled aria-disabled="true" title={t('reports.exportDisabled')}>
          {t('reports.export')}
        </Button>
      </div>
    </div>
  );

  if (summary.state.status === 'loading') {
    return (
      <>
        {toolbar}
        <SummaryLoading />
      </>
    );
  }

  const data = summary.state.data;
  const periodLabel = formatPeriodLabel(data.period);
  const activeGranularity = t(`reports.granularity.${data.granularity}`);

  return (
    <>
      {toolbar}

      <div className="mf-dashboard-hero">
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

      <Card
        title={t('reports.seriesTitle')}
        subtitle={t('reports.seriesSubtitle', {
          granularity: activeGranularity,
          period: periodLabel,
        })}
      >
        {data.series.length > 0 ? (
          <div className="mf-table-wrap">
            <table className="mf-table">
              <caption className="mf-table__caption">
                {t('reports.tableCaption', {
                  period: periodLabel,
                  granularity: activeGranularity,
                })}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{t('reports.colBucket')}</th>
                  <th scope="col">{t('reports.colIncome')}</th>
                  <th scope="col">{t('reports.colExpense')}</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map((bucket) => (
                  <tr key={bucket.startDate}>
                    <th scope="row">{formatRangeLabel(bucket.startDate, bucket.endDate)}</th>
                    <td>{formatBdtMinor(bucket.incomeMinor)}</td>
                    <td>{formatBdtMinor(bucket.expenseMinor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">{t('reports.colTotal')}</th>
                  <td>{formatBdtMinor(data.totals.incomeMinor)}</td>
                  <td>{formatBdtMinor(data.totals.expenseMinor)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="mf-empty">
            <p className="mf-empty__title">{t('reports.seriesEmpty')}</p>
          </div>
        )}
        {data.weekStartsOn === 'SATURDAY' ? (
          <p className="mf-chart-note">{t('reports.weekStartsNote')}</p>
        ) : null}
        <p className="mf-chart-note">
          {t('reports.recordedNote', { timezone: data.period.timezone })}
        </p>
      </Card>

      <Card
        title={t('reports.categoriesTitle')}
        subtitle={t('reports.categoriesSubtitle', { period: periodLabel })}
      >
        {categories.state.status === 'loading' ? (
          <div className="mf-loading" aria-busy="true" aria-label={t('common.loading')}>
            <div className="mf-skeleton mf-skeleton--line" />
            <div className="mf-skeleton mf-skeleton--line" />
          </div>
        ) : categories.state.status === 'signedOut' ? (
          <SummarySignedOut />
        ) : categories.state.status === 'error' ? (
          <SummaryError onRetry={categories.retry} />
        ) : categories.state.data.categories.length > 0 ? (
          <CategoryBars
            categories={categoryBarData(categories.state.data.categories)}
            periodLabel={periodLabel}
            totalText={formatBdtMinor(categories.state.data.totalExpenseMinor)}
          />
        ) : (
          <div className="mf-empty">
            <p className="mf-empty__title">{t('reports.categoriesEmpty')}</p>
          </div>
        )}
      </Card>
    </>
  );
}
