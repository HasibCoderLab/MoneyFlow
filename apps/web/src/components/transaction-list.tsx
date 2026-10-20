'use client';

import { AdjustmentIcon, ExpenseIcon, IncomeIcon, TransferIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/locale-context';
import type { TransactionRow } from '@/lib/summary-display';

type TransactionListProps = {
  readonly transactions: readonly TransactionRow[];
  /** Optional row actions for the full transactions screen. */
  readonly onEdit?: (transaction: TransactionRow) => void;
  readonly onDelete?: (transaction: TransactionRow) => void;
};

const DIRECTION_ICONS = {
  income: IncomeIcon,
  expense: ExpenseIcon,
  transfer: TransferIcon,
  adjustment: AdjustmentIcon,
} as const;

/**
 * Transaction list over the neutral `TransactionRow` display model, shared by
 * the wired dashboard and transactions screen. Meaning is carried by the
 * visible type label, the +/− sign, and an icon — never color alone
 * (requirements.md §7.3). Amounts arrive pre-formatted exactly as the API
 * produced them.
 */
export function TransactionList({ transactions, onEdit, onDelete }: TransactionListProps) {
  const { t } = useLocale();

  return (
    <ul className="mf-tx-list">
      {transactions.map((transaction) => {
        const DirectionIcon = DIRECTION_ICONS[transaction.direction];
        const description = transaction.description ?? t(`tx.fallback.${transaction.direction}`);
        return (
          <li key={transaction.id} className={`mf-tx mf-tx--${transaction.direction}`}>
            <span className="mf-tx__icon" aria-hidden="true">
              <DirectionIcon />
            </span>
            <div className="mf-tx__main">
              <p className="mf-tx__description">{description}</p>
              <p className="mf-tx__meta">
                <span className="mf-tx__type">{t(`tx.type.${transaction.direction}`)}</span>
                {transaction.category ? <span>{transaction.category}</span> : null}
                {transaction.accountLabel ? <span>{transaction.accountLabel}</span> : null}
                <span>{transaction.dateLabel}</span>
              </p>
            </div>
            <p className="mf-tx__amount">{transaction.amountText}</p>
            {onEdit || onDelete ? (
              <div className="mf-tx__actions">
                {onEdit ? (
                  <Button
                    variant="ghost"
                    onClick={() => onEdit(transaction)}
                    aria-label={`Edit transaction: ${description}`}
                  >
                    Edit
                  </Button>
                ) : null}
                {onDelete ? (
                  <Button
                    variant="ghost"
                    onClick={() => onDelete(transaction)}
                    aria-label={`Delete transaction: ${description}`}
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
