'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  CreateTransactionRequest,
  TransactionResponse,
  TransactionType,
  UpdateTransactionRequest,
} from '@moneyflow/contracts';

import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { Button } from '@/components/ui/button';
import {
  ApiClientError,
  createTransaction,
  fetchAccounts,
  fetchCategories,
  updateTransaction,
} from '@/lib/api-client';
import { isValidPositiveAmount, minorToDecimalInput } from '@/lib/goals-format';
import { useLocale } from '@/lib/i18n/locale-context';
import {
  isValidCalendarDate,
  isValidOccurredTime,
  localDateFromInstant,
  localTimeFromInstant,
  todayInTimezone,
} from '@/lib/transaction-input';
import { useAsyncData } from '@/lib/use-async-data';

type FormType = TransactionType;
type AdjustmentDirection = 'INCREASE' | 'DECREASE';

const CREATE_TYPES: readonly FormType[] = ['INCOME', 'EXPENSE', 'TRANSFER'];

const TYPE_LABEL: Record<FormType, string> = {
  INCOME: 'Money in',
  EXPENSE: 'Money out',
  TRANSFER: 'Transfer',
  ADJUSTMENT: 'Adjustment',
};

/** One idempotency key per form instance, reused after a failed/retried submit. */
function newIdempotencyKey(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type FieldErrors = {
  amount?: string;
  account?: string;
  toAccount?: string;
  category?: string;
  date?: string;
  time?: string;
  note?: string;
};

/**
 * Transaction create/edit form. Account and category choices come from the
 * authenticated APIs; saving POSTs/PATCHes the record and refreshes the
 * caller. Client validation mirrors the server grammar but never replaces
 * the server's checks (requirements.md §5.4, §7.5, §11.1).
 */
export function TransactionForm({
  transaction = null,
  onSaved,
  onCancel,
}: {
  readonly transaction?: TransactionResponse | null;
  readonly onSaved?: (transaction: TransactionResponse) => void;
  readonly onCancel?: () => void;
}) {
  const { preferences } = useLocale();
  const loadOptions = useCallback(() => Promise.all([fetchAccounts(), fetchCategories(false)]), []);
  const options = useAsyncData(loadOptions);

  const [type, setType] = useState<FormType>(transaction?.type ?? 'EXPENSE');
  const [amount, setAmount] = useState(
    transaction ? minorToDecimalInput(transaction.amountMinor) : '',
  );
  const [account, setAccount] = useState(
    transaction?.accountId ?? transaction?.fromAccountId ?? '',
  );
  const [toAccount, setToAccount] = useState(transaction?.toAccountId ?? '');
  const [category, setCategory] = useState(transaction?.categoryId ?? '');
  const [direction, setDirection] = useState<AdjustmentDirection>(
    transaction?.adjustmentSign === -1 ? 'DECREASE' : 'INCREASE',
  );
  const [date, setDate] = useState(
    transaction ? localDateFromInstant(transaction.occurredAt, preferences.timezone) : '',
  );
  const [time, setTime] = useState(
    transaction ? localTimeFromInstant(transaction.occurredAt, preferences.timezone) : '',
  );
  const [note, setNote] = useState(transaction?.note ?? '');
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const dateTouched = useRef(false);
  const timeTouched = useRef(false);

  // Default dates after mount (and when the saved timezone arrives) avoid a
  // server/client mismatch; user edits are never overwritten.
  useEffect(() => {
    if (dateTouched.current) return;
    setDate(
      transaction
        ? localDateFromInstant(transaction.occurredAt, preferences.timezone)
        : todayInTimezone(preferences.timezone),
    );
  }, [transaction, preferences.timezone]);

  useEffect(() => {
    if (timeTouched.current) return;
    if (transaction) {
      setTime(localTimeFromInstant(transaction.occurredAt, preferences.timezone));
    }
  }, [transaction, preferences.timezone]);

  if (options.state.status === 'loading') {
    return <SummaryLoading />;
  }
  if (options.state.status === 'signedOut') {
    return <SummarySignedOut />;
  }
  if (options.state.status === 'error') {
    return <SummaryError onRetry={options.retry} />;
  }

  const allAccounts = options.state.data[0];
  const allCategories = options.state.data[1];
  const accounts = allAccounts.filter(
    (item) =>
      item.status === 'ACTIVE' ||
      item.id === transaction?.accountId ||
      item.id === transaction?.fromAccountId ||
      item.id === transaction?.toAccountId,
  );
  const categories = allCategories.filter(
    (item) =>
      (item.status === 'ACTIVE' && item.type === type) ||
      (item.type === type && item.id === transaction?.categoryId),
  );

  const today = todayInTimezone(preferences.timezone);
  const errors: FieldErrors = {};
  const trimmedAmount = amount.trim();
  if (trimmedAmount.length === 0) {
    errors.amount = 'Enter an amount greater than zero.';
  } else if (!isValidPositiveAmount(trimmedAmount)) {
    errors.amount = 'Use digits with at most 2 decimals, e.g. 3500 or 3500.50.';
  }
  if (!account)
    errors.account = type === 'TRANSFER' ? 'Choose a source account.' : 'Choose an account.';
  if (type === 'TRANSFER') {
    if (!toAccount) errors.toAccount = 'Choose a destination account.';
    else if (toAccount === account)
      errors.toAccount = 'Destination must differ from the source account.';
  } else if (type !== 'ADJUSTMENT' && !category) {
    errors.category = 'Choose a category.';
  }
  if (!date) errors.date = 'Choose a date.';
  else if (!isValidCalendarDate(date)) errors.date = 'Choose a real calendar date.';
  else if (date > today)
    errors.date = 'Future dates are not accepted; record planned spending later.';
  if (time.length > 0 && !isValidOccurredTime(time)) errors.time = 'Use a valid 24-hour time.';
  if (type === 'ADJUSTMENT' && note.trim().length === 0) {
    errors.note = 'A note is required for an adjustment.';
  }

  const showErrors = touched;

  const submit = async () => {
    setTouched(true);
    if (Object.values(errors).some((value) => value !== undefined)) return;

    setSaving(true);
    setServerError(null);
    const common = {
      amount: trimmedAmount,
      occurredDate: date,
      ...(time.length > 0 ? { occurredTime: time } : {}),
      timezone: preferences.timezone,
      ...(note.trim().length > 0 ? { note: note.trim() } : {}),
    } as const;

    let createBody: CreateTransactionRequest;
    let updateBody: UpdateTransactionRequest;
    if (type === 'TRANSFER') {
      createBody = { ...common, type, fromAccountId: account, toAccountId: toAccount };
      updateBody = { ...common, fromAccountId: account, toAccountId: toAccount };
    } else if (type === 'ADJUSTMENT') {
      createBody = { ...common, type, accountId: account, direction };
      updateBody = { ...common, accountId: account, direction };
    } else {
      createBody = { ...common, type, accountId: account, categoryId: category };
      updateBody = { ...common, accountId: account, categoryId: category };
    }

    try {
      let saved: TransactionResponse;
      if (transaction) {
        saved = await updateTransaction(transaction.id, updateBody);
      } else {
        idempotencyKey.current ??= newIdempotencyKey();
        saved = await createTransaction(createBody, idempotencyKey.current);
      }
      onSaved?.(saved);
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Could not save the transaction.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0 && transaction === null) {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">Add an account first</p>
        <p className="mf-empty__text">
          A transaction needs an active account. Create one, then come back to record the movement.
        </p>
        <Link className="mf-btn mf-btn--primary" href="/app/accounts">
          Go to Accounts
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mf-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      {serverError ? (
        <p className="mf-form__error" role="alert">
          {serverError}
        </p>
      ) : null}

      <fieldset className="mf-field">
        <legend className="mf-field__label">Type</legend>
        {transaction ? (
          <p className="mf-field__hint">{TYPE_LABEL[type]} (type cannot be changed)</p>
        ) : (
          <div className="mf-radio-row" role="radiogroup" aria-label="Transaction type">
            {CREATE_TYPES.map((value) => (
              <label key={value} className="mf-radio">
                <input
                  type="radio"
                  name="transaction-type"
                  value={value}
                  checked={type === value}
                  onChange={() => {
                    setType(value);
                    setCategory('');
                    setToAccount('');
                  }}
                />
                <span>{TYPE_LABEL[value]}</span>
              </label>
            ))}
          </div>
        )}
        <p className="mf-field__hint">
          Transfers move money between your own accounts — never counted as income or spending.
        </p>
      </fieldset>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor="transaction-amount">
          Amount (BDT)
        </label>
        <input
          id="transaction-amount"
          className="mf-input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 3500.50"
          value={amount}
          aria-invalid={showErrors && errors.amount ? true : undefined}
          onChange={(event) => setAmount(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {showErrors && errors.amount ? (
          <p className="mf-field__error" role="alert">
            {errors.amount}
          </p>
        ) : null}
      </div>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor="transaction-account">
          {type === 'TRANSFER' ? 'From account' : 'Account'}
        </label>
        <select
          id="transaction-account"
          className="mf-input"
          value={account}
          aria-invalid={showErrors && errors.account ? true : undefined}
          onChange={(event) => setAccount(event.target.value)}
          onBlur={() => setTouched(true)}
        >
          <option value="">Select an account</option>
          {accounts.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        {showErrors && errors.account ? (
          <p className="mf-field__error" role="alert">
            {errors.account}
          </p>
        ) : null}
      </div>

      {type === 'TRANSFER' ? (
        <div className="mf-field">
          <label className="mf-field__label" htmlFor="transaction-to-account">
            To account
          </label>
          <select
            id="transaction-to-account"
            className="mf-input"
            value={toAccount}
            aria-invalid={showErrors && errors.toAccount ? true : undefined}
            onChange={(event) => setToAccount(event.target.value)}
            onBlur={() => setTouched(true)}
          >
            <option value="">Select a destination</option>
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {showErrors && errors.toAccount ? (
            <p className="mf-field__error" role="alert">
              {errors.toAccount}
            </p>
          ) : null}
        </div>
      ) : type === 'ADJUSTMENT' ? (
        <label className="mf-field">
          <span className="mf-field__label">Adjustment direction</span>
          <select
            className="mf-input"
            value={direction}
            onChange={(event) => setDirection(event.target.value as AdjustmentDirection)}
          >
            <option value="INCREASE">Increase the recorded balance</option>
            <option value="DECREASE">Decrease the recorded balance</option>
          </select>
        </label>
      ) : (
        <div className="mf-field">
          <label className="mf-field__label" htmlFor="transaction-category">
            Category
          </label>
          <select
            id="transaction-category"
            className="mf-input"
            value={category}
            aria-invalid={showErrors && errors.category ? true : undefined}
            onChange={(event) => setCategory(event.target.value)}
            onBlur={() => setTouched(true)}
          >
            <option value="">Select a category</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.status === 'ARCHIVED' ? ' (archived)' : ''}
              </option>
            ))}
          </select>
          {showErrors && errors.category ? (
            <p className="mf-field__error" role="alert">
              {errors.category}
            </p>
          ) : null}
        </div>
      )}

      <div className="mf-form-grid">
        <div className="mf-field">
          <label className="mf-field__label" htmlFor="transaction-date">
            Date
          </label>
          <input
            id="transaction-date"
            className="mf-input"
            type="date"
            max={today}
            value={date}
            aria-invalid={showErrors && errors.date ? true : undefined}
            onChange={(event) => {
              dateTouched.current = true;
              setDate(event.target.value);
            }}
            onBlur={() => setTouched(true)}
          />
          {showErrors && errors.date ? (
            <p className="mf-field__error" role="alert">
              {errors.date}
            </p>
          ) : null}
        </div>

        <div className="mf-field">
          <label className="mf-field__label" htmlFor="transaction-time">
            Time <span className="mf-field__optional">(optional)</span>
          </label>
          <input
            id="transaction-time"
            className="mf-input"
            type="time"
            value={time}
            aria-invalid={showErrors && errors.time ? true : undefined}
            onChange={(event) => {
              timeTouched.current = true;
              setTime(event.target.value);
            }}
            onBlur={() => setTouched(true)}
          />
          {showErrors && errors.time ? (
            <p className="mf-field__error" role="alert">
              {errors.time}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor="transaction-note">
          Note{' '}
          <span className="mf-field__optional">
            {type === 'ADJUSTMENT' ? '(required)' : '(optional)'}
          </span>
        </label>
        <input
          id="transaction-note"
          className="mf-input"
          type="text"
          maxLength={500}
          placeholder="e.g. Monthly groceries"
          value={note}
          aria-invalid={showErrors && errors.note ? true : undefined}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {showErrors && errors.note ? (
          <p className="mf-field__error" role="alert">
            {errors.note}
          </p>
        ) : null}
      </div>

      <div className="mf-form__actions">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : transaction ? 'Save changes' : 'Save transaction'}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <p className="mf-field__hint">
          Saved to your account. Times use {preferences.timezone}; a date without a time is recorded
          at local noon.
        </p>
      </div>
    </form>
  );
}
