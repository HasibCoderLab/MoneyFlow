import type { ReactNode } from 'react';

type StatCardProps = {
  /** Label may be a runtime string so translated pages can pass I18nText. */
  readonly label: ReactNode;
  /** Pre-formatted exact amount text, e.g. "BDT 3,500" from the money formatter. */
  readonly amountText: string;
  /** Short neutral context, e.g. the period the figure belongs to. */
  readonly context?: string;
  /** Optional decorative icon tile (decorative only — label carries meaning). */
  readonly icon?: ReactNode;
  readonly tone?: 'default' | 'income' | 'expense';
};

/** KPI figure card: icon tile + label + pre-formatted amount + context line. */
export function StatCard({ label, amountText, context, icon, tone = 'default' }: StatCardProps) {
  return (
    <div className="mf-stat-card">
      {icon ? (
        <span className={`mf-stat-card__icon mf-stat-card__icon--${tone}`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="mf-stat-card__label">{label}</p>
      <p className="mf-stat-card__amount">{amountText}</p>
      {context ? <p className="mf-stat-card__context">{context}</p> : null}
    </div>
  );
}
