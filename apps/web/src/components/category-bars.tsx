import { formatBdt } from '@/lib/format';
import type { MockCategorySpend } from '@/lib/mock-data';

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
  readonly categories: readonly MockCategorySpend[];
  readonly periodLabel: string;
  /** Pre-formatted total shown in the donut centre (sample figure). */
  readonly totalAmount: string;
};

/**
 * Spending-by-category donut + legend (sample). Charts must answer a
 * real question and include an accessible summary (requirements.md
 * §7.3), so a plain-text summary precedes the visual, the legend carries
 * every amount and share as text, and the SVG is decorative
 * (`aria-hidden`). Percentages come from mock data as literals; only
 * their stroke geometry is computed here.
 */
export function CategoryBars({ categories, periodLabel, totalAmount }: CategoryBarsProps) {
  const topCategory = categories[0];

  let runningPercent = 0;
  const segments = categories.map((category, index) => {
    const startPercent = runningPercent;
    runningPercent += category.percentOfTotal;
    return {
      ...category,
      color: SEGMENT_COLORS[index % SEGMENT_COLORS.length],
      dashOffset: -(startPercent / 100) * CIRCUMFERENCE,
      dashLength: (category.percentOfTotal / 100) * CIRCUMFERENCE,
    };
  });

  return (
    <div className="mf-category-bars">
      <p className="mf-chart-summary" data-testid="chart-summary">
        {topCategory
          ? `In this sample period, ${topCategory.name} is the largest category at ${formatBdt(topCategory.amount)} (${topCategory.percentOfTotal}% of the sample spending).`
          : 'No sample spending data.'}
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
              key={segment.name}
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
          <p className="mf-donut__total">{formatBdt(totalAmount)}</p>
          <p className="mf-donut__caption">spent (sample)</p>
        </div>
      </div>

      <ul className="mf-legend">
        {segments.map((segment) => (
          <li key={segment.name} className="mf-legend__row">
            <span className="mf-legend__dot" style={{ background: segment.color }} />
            <span className="mf-legend__name">{segment.name}</span>
            <span className="mf-legend__value">{formatBdt(segment.amount)}</span>
            <span className="mf-legend__percent">{segment.percentOfTotal}%</span>
          </li>
        ))}
      </ul>

      <p className="mf-chart-note">Sample spending for {periodLabel}.</p>
    </div>
  );
}
