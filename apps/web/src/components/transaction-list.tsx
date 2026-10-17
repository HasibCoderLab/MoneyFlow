import { ExpenseIcon, IncomeIcon, TransferIcon } from '@/components/icons';
import { formatSignedBdt } from '@/lib/format';
import type { MockTransaction } from '@/lib/mock-data';

type TransactionListProps = {
  readonly transactions: readonly MockTransaction[];
};

const DIRECTION_LABELS: Record<MockTransaction['direction'], string> = {
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

const DIRECTION_ICONS = {
  income: IncomeIcon,
  expense: ExpenseIcon,
  transfer: TransferIcon,
} as const;

/**
 * Recent-activity list. Type meaning is carried by the visible text
 * label, the +/− sign, and an icon — never color alone
 * (requirements.md §7.3).
 */
export function TransactionList({ transactions }: TransactionListProps) {
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
              <p className="mf-tx__description">{transaction.description}</p>
              <p className="mf-tx__meta">
                <span className="mf-tx__type">{DIRECTION_LABELS[transaction.direction]}</span>
                <span>{transaction.category}</span>
                <span>{transaction.dateLabel}</span>
              </p>
            </div>
            <p className="mf-tx__amount">
              {formatSignedBdt(transaction.amount, transaction.direction)}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
