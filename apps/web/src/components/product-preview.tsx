import type { ReactNode } from 'react';

import { BudgetsIcon, GoalsIcon, ShieldIcon, SparkleIcon } from '@/components/icons';
import {
  MOCK_DATA_DISCLAIMER,
  MOCK_RECENT_TRANSACTIONS,
  MOCK_SAVINGS_GOALS,
} from '@/lib/mock-data';

/**
 * Illustrative dashboard preview for the public landing page.
 *
 * This is a marketing composition, not a real dashboard: every figure is a
 * hand-written literal from mock-data.ts and is explicitly labelled as
 * illustrative demo data. It performs no calculations and connects to no
 * backend. It exists so a visitor can see the shape of the product.
 */

function Amount({ children }: { readonly children: ReactNode }) {
  return <span className="mf-preview-amount">{children}</span>;
}

function StatPill({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone: 'income' | 'expense';
}) {
  return (
    <div className={`mf-preview-stat mf-preview-stat--${tone}`}>
      <p className="mf-preview-stat__label">{label}</p>
      <p className="mf-preview-stat__value">
        <Amount>{value}</Amount>
      </p>
    </div>
  );
}

function TxRow({
  description,
  category,
  amount,
  direction,
}: {
  readonly description: string;
  readonly category: string;
  readonly amount: string;
  readonly direction: 'income' | 'expense' | 'transfer';
}) {
  const sign = direction === 'income' ? '+' : '−';
  return (
    <div className={`mf-preview-tx mf-preview-tx--${direction}`}>
      <div className="mf-preview-tx__icon" aria-hidden="true">
        {direction === 'income' ? '+' : '−'}
      </div>
      <div className="mf-preview-tx__main">
        <p className="mf-preview-tx__desc">{description}</p>
        <p className="mf-preview-tx__meta">{category}</p>
      </div>
      <span className={`mf-preview-tx__amount mf-preview-tx__amount--${direction}`}>
        {sign}
        {amount}
      </span>
    </div>
  );
}

function GoalBar({
  name,
  saved,
  target,
  percent,
}: {
  readonly name: string;
  readonly saved: string;
  readonly target: string;
  readonly percent: number;
}) {
  return (
    <div className="mf-preview-goal">
      <div className="mf-preview-goal__head">
        <p className="mf-preview-goal__name">{name}</p>
        <p className="mf-preview-goal__nums">
          <Amount>{saved}</Amount>
          <span className="mf-preview-goal__of">of</span>
          <Amount>{target}</Amount>
        </p>
      </div>
      <div
        className="mf-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-label={`${name}: ${percent} percent of goal reached`}
      >
        <div className="mf-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="mf-preview-goal__pct">{percent}% of goal</p>
    </div>
  );
}

export function ProductPreview() {
  const goal = MOCK_SAVINGS_GOALS[0];
  if (!goal) return null;

  return (
    <aside className="mf-preview" aria-label="Illustrative product preview">
      <div className="mf-preview__frame">
        <div className="mf-preview__top">
          <span className="mf-preview__badge" role="note">
            <ShieldIcon /> Illustrative preview — demo data
          </span>
          <span className="mf-preview__period">October 2026</span>
        </div>

        <div className="mf-preview__hero">
          <div>
            <p className="mf-preview__label">Tracked balance</p>
            <p className="mf-preview__balance">
              <Amount>{'12,450'}</Amount>
            </p>
            <p className="mf-preview__sub">Across 3 active accounts</p>
          </div>
          <div className="mf-preview__spark" aria-hidden="true">
            <svg viewBox="0 0 120 40" width="100%" height="40" preserveAspectRatio="none">
              <path
                d="M0 30 L18 24 L36 28 L54 16 L72 20 L90 10 L120 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="mf-preview__kpis">
          <StatPill label="Income this month" value="18,000" tone="income" />
          <StatPill label="Spent this month" value="9,750" tone="expense" />
        </div>

        <div className="mf-preview__block">
          <div className="mf-preview__block-head">
            <p className="mf-preview__block-title">Savings goal</p>
            <GoalsIcon />
          </div>
          <GoalBar
            name={goal.name}
            saved={goal.saved}
            target={goal.target}
            percent={goal.percent}
          />
        </div>

        <div className="mf-preview__block">
          <div className="mf-preview__block-head">
            <p className="mf-preview__block-title">Recent activity</p>
            <BudgetsIcon />
          </div>
          <div className="mf-preview-tx-list">
            {MOCK_RECENT_TRANSACTIONS.slice(0, 4).map((tx) => (
              <TxRow
                key={tx.id}
                description={tx.description}
                category={tx.category}
                amount={tx.amount}
                direction={tx.direction}
              />
            ))}
          </div>
          <p className="mf-preview__hint">{MOCK_DATA_DISCLAIMER}</p>
        </div>

        <div className="mf-preview__footer">
          <SparkleIcon /> This is a static illustration of the planned experience.
        </div>
      </div>
    </aside>
  );
}
