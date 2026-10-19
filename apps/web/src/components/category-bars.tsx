'use client';

import { useLocale } from '@/lib/i18n/locale-context';
import type { CategoryBarDatum } from '@/lib/summary-display';

/**
 * Brand-palette segments, ordered as authored. Token references (not hex
 * literals) so the chart follows light/dark themes automatically — SVG
 * consumes them through the `style` prop, where `var()` resolves. The two
 * extra slots keep the palette coherent if categories are edited later.
 */
const SEGMENT_COLORS = [
  'var(--mf-primary)',
  'var(--mf-accent-purple)',
  'var(--mf-accent-cyan)',
  'var(--mf-accent-warm)',
  'var(--mf-transfer)',
  'var(--mf-border-strong)',
];

const CHART_SIZE = 160;
const RADIUS = 64;
/** 2πr — presentation geometry only; never applied to financial values. */
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const RING_WIDTH = 17;

type CategoryBarsProps = {
  readonly categories: readonly CategoryBarDatum[];
  readonly periodLabel: string;
  /** Pre-formatted exact total shown in the donut centre (from the API). */
  readonly totalText: string;
};

/**
 * Spending-by-category donut + legend over API data. Charts must answer a
 * real question and include an accessible summary (requirements.md §7.3),
 * so a plain-text summary precedes the visual, the legend carries every
 * amount and server-computed share as text, and the SVG is decorative
 * (`aria-hidden`). Shares arrive as server percentages; only their stroke
 * geometry is computed here — no money math, no client-side rounding.
 */
export function CategoryBars({ categories, periodLabel, totalText }: CategoryBarsProps) {
  const { t } = useLocale();
  const topCategory = categories[0];

  let runningPercent = 0;
  const segments = categories.map((category, index) => {
    const startPercent = runningPercent;
    runningPercent += category.sharePercent;
    return {
      ...category,
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
      dashOffset: -(startPercent / 100) * CIRCUMFERENCE,
      dashLength: (category.sharePercent / 100) * CIRCUMFERENCE,
    };
  });

  return (
    <div className="mf-category-bars">
      <p className="mf-chart-summary" data-testid="chart-summary">
        {topCategory
          ? t('summary.categorySummary', {
              period: periodLabel,
              name: topCategory.name,
              amount: topCategory.amountText,
              percent: topCategory.percentText,
            })
          : t('summary.noSpending')}
      </p>

      <div className="mf-donut">
        <svg
          width={CHART_SIZE}
          height={CHART_SIZE}
          viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}
          aria-hidden="true"
          focusable="false"
        >
          <circle
            cx={CHART_SIZE / 2}
            cy={CHART_SIZE / 2}
            r={RADIUS}
            fill="none"
            style={{ stroke: 'var(--mf-track)' }}
            strokeWidth={RING_WIDTH}
          />
          {segments.map((segment) => (
            <circle
              key={segment.categoryId}
              cx={CHART_SIZE / 2}
              cy={CHART_SIZE / 2}
              r={RADIUS}
              fill="none"
              style={{ stroke: segment.color }}
              strokeWidth={RING_WIDTH}
              strokeDasharray={`${segment.dashLength} ${CIRCUMFERENCE}`}
              strokeDashoffset={segment.dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${CHART_SIZE / 2} ${CHART_SIZE / 2})`}
            />
          ))}
        </svg>
        <div className="mf-donut__center">
          <p className="mf-donut__total">{totalText}</p>
          <p className="mf-donut__caption">{t('summary.spentCaption')}</p>
        </div>
      </div>

      <ul className="mf-legend">
        {segments.map((segment) => (
          <li key={segment.categoryId} className="mf-legend__row">
            <span className="mf-legend__dot" style={{ background: segment.color }} />
            <span className="mf-legend__name">{segment.name}</span>
            <span className="mf-legend__value">{segment.amountText}</span>
            <span className="mf-legend__percent">{segment.percentText}</span>
          </li>
        ))}
      </ul>

      <p className="mf-chart-note">{t('summary.categoryNote', { period: periodLabel })}</p>
    </div>
  );
}
