'use client';

import type { GoalResponse } from '@moneyflow/contracts';

import { ProgressBar } from '@/components/progress-bar';
import { cappedPercent } from '@/lib/goals-format';
import { useLocale } from '@/lib/i18n/locale-context';
import { formatBdtMinor, formatPercentTimes10 } from '@/lib/money-format';

/**
 * Progress block shared by the goals list and the goal detail page
 * (requirements.md §5.8, ADR-0005). Every figure is the server's exact
 * ledger-derived value: the bar caps visually at 100% while the text keeps
 * the real percentage and the unclamped remainder, so overfunding reads
 * truthfully ("BDT 6,000 over target", "120% of target").
 */
export function GoalProgress({ goal }: { readonly goal: GoalResponse }) {
  const { t } = useLocale();
  const percent = formatPercentTimes10(goal.figures.percentTimes10);
  const remaining = goal.figures.remainingMinor;
  const remainderText = remaining.startsWith('-')
    ? t('goals.overTarget', { amount: formatBdtMinor(remaining.slice(1)) })
    : t('goals.remaining', { amount: formatBdtMinor(remaining) });

  return (
    <div className="mf-goal">
      <ProgressBar
        label={`${goal.name} progress`}
        percent={cappedPercent(goal.figures.percentTimes10)}
        percentText={percent === null ? undefined : t('goals.percentOfTarget', { percent })}
        valueText={t('goals.savedOf', {
          saved: formatBdtMinor(goal.figures.savedMinor),
          target: formatBdtMinor(goal.targetMinor),
        })}
        emphasis={goal.figures.overfunded ? 'attention' : 'normal'}
      />
      <p className="mf-goal__remaining">{remainderText}</p>
    </div>
  );
}
