'use client';

import Link from 'next/link';
import { useCallback } from 'react';

import { Card } from '@/components/card';
import { ProgressBar } from '@/components/progress-bar';
import { fetchGoals } from '@/lib/api-client';
import { cappedPercent } from '@/lib/goals-format';
import { useLocale } from '@/lib/i18n/locale-context';
import { formatBdtMinor, formatPercentTimes10 } from '@/lib/money-format';
import { useAsyncData } from '@/lib/use-async-data';

/** Dashboard shows the highest-priority few goals; the goals page has all. */
const DASHBOARD_GOAL_LIMIT = 3;

/**
 * Dashboard goals widget (IT-10, requirements.md §5.6/§5.8). Figures come
 * from `GET /api/v1/goals` — the server's exact ledger sums and percentages —
 * so the dashboard can show real goal progress instead of a placeholder.
 * Progress is labelled as tracking only; it never implies money moved between
 * accounts, and an empty list renders an honest empty state rather than a
 * fabricated goal.
 */
export function DashboardGoalsCard() {
  const { t, preferences } = useLocale();
  const load = useCallback(() => fetchGoals(false), []);
  const { state, retry } = useAsyncData(load);

  const action = (
    <Link className="mf-card__action" href="/app/goals">
      {t('common.manage')}
    </Link>
  );

  if (state.status === 'loading') {
    return (
      <Card
        title={t('dashboard.goalsTitle')}
        subtitle={t('dashboard.goalsSubtitle')}
        action={action}
      >
        <div className="mf-loading" aria-busy="true" aria-label={t('common.loading')}>
          <div className="mf-skeleton mf-skeleton--line" />
          <div className="mf-skeleton mf-skeleton--line" />
        </div>
      </Card>
    );
  }

  if (state.status === 'signedOut') {
    return (
      <Card
        title={t('dashboard.goalsTitle')}
        subtitle={t('dashboard.goalsSubtitle')}
        action={action}
      >
        <p className="mf-empty__text">{t('summary.signedOutTitle')}</p>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card
        title={t('dashboard.goalsTitle')}
        subtitle={t('dashboard.goalsSubtitle')}
        action={action}
      >
        <p className="mf-empty__text">{t('summary.errorTitle')}</p>
        <button type="button" className="mf-btn mf-btn--ghost" onClick={retry}>
          {t('common.tryAgain')}
        </button>
      </Card>
    );
  }

  const goals = state.data.slice(0, DASHBOARD_GOAL_LIMIT);

  return (
    <Card title={t('dashboard.goalsTitle')} subtitle={t('dashboard.goalsSubtitle')} action={action}>
      {goals.length === 0 ? (
        <div className="mf-empty">
          <p className="mf-empty__title">{t('dashboard.goalsEmpty')}</p>
        </div>
      ) : (
        <>
          {goals.map((goal) => {
            const percent = formatPercentTimes10(goal.figures.percentTimes10, preferences);
            return (
              <div key={goal.id} className="mf-goal">
                <ProgressBar
                  label={`${goal.name} progress`}
                  percent={cappedPercent(goal.figures.percentTimes10)}
                  percentText={
                    percent === null ? undefined : t('goals.percentOfTarget', { percent })
                  }
                  valueText={t('goals.savedOf', {
                    saved: formatBdtMinor(goal.figures.savedMinor, preferences),
                    target: formatBdtMinor(goal.targetMinor, preferences),
                  })}
                  emphasis={goal.figures.overfunded ? 'attention' : 'normal'}
                />
              </div>
            );
          })}
          <p className="mf-chart-note">{t('dashboard.goalsNote')}</p>
        </>
      )}
    </Card>
  );
}
