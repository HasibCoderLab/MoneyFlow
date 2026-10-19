'use client';

import { AdjustmentIcon, ExpenseIcon, IncomeIcon, TransferIcon } from '@/components/icons';
import { useLocale } from '@/lib/i18n/locale-context';
import type { TransactionRow } from '@/lib/summary-display';

type TransactionListProps = {
  readonly transactions: readonly TransactionRow[];
};

const DIRECTION_ICONS = {
  income: IncomeIcon,
  expense: ExpenseIcon,
  transfer: TransferIcon,
  adjustment: AdjustmentIcon,
} as const;

/**
 * Recent-activity list over the neutral `TransactionRow` display model, so
 * the wired dashboard and the sample transactions browser share one row
 * renderer. Type meaning is carried by the visible text label, the +/− sign,
 * and an icon — never color alone (requirements.md §7.3). Labels resolve
 * through the locale dictionary; amounts arrive pre-formatted and exactly
 * as the API produced them.
 */
export function TransactionList({ transactions }: TransactionListProps) {
  const { t } = useLocale();

  return (
    <ul className="mf-tx-list">
      {transactions.map((transaction) => {
        const DirectionIcon = DIRECTION_ICONS[transaction.direction];
        return (
          <li key={transaction.id} className={`mf-tx mf-tx--${transaction.direction}`}>
            <span className="mf-tx__icon" aria-hidden="true">
              <DirectionIcon />
            </span>
            <div className="mf-tx__main">
              <p className="mf-tx__description">
                {transaction.description ?? t(`tx.fallback.${transaction.direction}`)}
              </p>
              <p className="mf-tx__meta">
                <span className="mf-tx__type">{t(`tx.type.${transaction.direction}`)}</span>
                {transaction.category ? <span>{transaction.category}</span> : null}
                <span>{transaction.dateLabel}</span>
              </p>
            </div>
            <p className="mf-tx__amount">{transaction.amountText}</p>
          </li>
        );
      })}
    </ul>
  );
}
