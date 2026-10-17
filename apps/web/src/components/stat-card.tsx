import type { ReactNode } from 'react';

import { formatBdt } from '@/lib/format';

type StatCardProps = {
  readonly label: string;
  /** Pre-formatted amount string (sample data in the preview). */
  readonly amount: string;
  /** Short neutral context, e.g. the period the figure belongs to. */
  readonly context?: string;
  /** Optional decorative icon tile (decorative only — label carries meaning). */
  readonly icon?: ReactNode;
  readonly tone?: 'default' | 'income' | 'expense';
};

/** KPI figure card: icon tile + label + BDT amount + context line. */
export function StatCard({ label, amount, context, icon, tone = 'default' }: StatCardProps) {
  return (
    <div className="mf-stat-card">
      {icon ? (
        <span className={`mf-stat-card__icon mf-stat-card__icon--${tone}`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="mf-stat-card__label">{label}</p>
      <p className="mf-stat-card__amount">{formatBdt(amount)}</p>
      {context ? <p className="mf-stat-card__context">{context}</p> : null}
    </div>
  );
}
