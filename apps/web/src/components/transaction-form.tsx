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
  const { preferences, t } = useLocale();
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
    errors.amount = t('txform.errorAmountRequired');
  } else if (!isValidPositiveAmount(trimmedAmount)) {
    errors.amount = t('txform.errorAmountFormat');
  }
  if (!account)
    errors.account = type === 'TRANSFER' ? t('txform.errorSource') : t('txform.errorAccount');
  if (type === 'TRANSFER') {
    if (!toAccount) errors.toAccount = t('txform.errorDestination');
    else if (toAccount === account) errors.toAccount = t('txform.errorSameAccount');
  } else if (type !== 'ADJUSTMENT' && !category) {
    errors.category = t('txform.errorCategory');
  }
  if (!date) errors.date = t('txform.errorDate');
  else if (!isValidCalendarDate(date)) errors.date = t('txform.errorRealDate');
  else if (date > today) errors.date = t('txform.errorFutureDate');
  if (time.length > 0 && !isValidOccurredTime(time)) errors.time = t('txform.errorTime');
  if (type === 'ADJUSTMENT' && note.trim().length === 0) {
    errors.note = t('txform.errorNoteRequired');
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
      setServerError(error instanceof ApiClientError ? error.message : t('txform.serverError'));
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0 && transaction === null) {
    return (
      <div className="mf-empty">
        <p className="mf-empty__title">{t('txform.addAccountTitle')}</p>
        <p className="mf-empty__text">{t('txform.addAccountBody')}</p>
        <Link className="mf-btn mf-btn--primary" href="/app/accounts">
          {t('txform.goToAccounts')}
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
        <legend className="mf-field__label">{t('txform.typeLegend')}</legend>
        {transaction ? (
          <p className="mf-field__hint">
            {t('txform.typeCannotChange', { type: t(`txform.type.${type}`) })}
          </p>
        ) : (
          <div className="mf-radio-row" role="radiogroup" aria-label={t('txform.typeAria')}>
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
                <span>{t(`txform.type.${value}`)}</span>
              </label>
            ))}
          </div>
        )}
        <p className="mf-field__hint">{t('txform.typeHint')}</p>
      </fieldset>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor="transaction-amount">
          {t('txform.amountLabel')}
        </label>
        <input
          id="transaction-amount"
          className="mf-input"
          inputMode="decimal"
          autoComplete="off"
          placeholder={t('txform.amountPlaceholder')}
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
          {type === 'TRANSFER' ? t('txform.fromAccount') : t('txform.account')}
        </label>
        <select
          id="transaction-account"
          className="mf-input"
          value={account}
          aria-invalid={showErrors && errors.account ? true : undefined}
          onChange={(event) => setAccount(event.target.value)}
          onBlur={() => setTouched(true)}
        >
          <option value="">{t('txform.selectAccount')}</option>
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
            {t('txform.toAccount')}
          </label>
          <select
            id="transaction-to-account"
            className="mf-input"
            value={toAccount}
            aria-invalid={showErrors && errors.toAccount ? true : undefined}
            onChange={(event) => setToAccount(event.target.value)}
            onBlur={() => setTouched(true)}
          >
            <option value="">{t('txform.selectDestination')}</option>
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
          <span className="mf-field__label">{t('txform.adjustmentDirection')}</span>
          <select
            className="mf-input"
            value={direction}
            onChange={(event) => setDirection(event.target.value as AdjustmentDirection)}
          >
            <option value="INCREASE">{t('txform.increase')}</option>
            <option value="DECREASE">{t('txform.decrease')}</option>
          </select>
        </label>
      ) : (
        <div className="mf-field">
          <label className="mf-field__label" htmlFor="transaction-category">
            {t('txform.category')}
          </label>
          <select
            id="transaction-category"
            className="mf-input"
            value={category}
            aria-invalid={showErrors && errors.category ? true : undefined}
            onChange={(event) => setCategory(event.target.value)}
            onBlur={() => setTouched(true)}
          >
            <option value="">{t('txform.selectCategory')}</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.status === 'ARCHIVED' ? t('txform.archivedSuffix') : ''}
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
            {t('txform.date')}
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
            {t('txform.time')}{' '}
            <span className="mf-field__optional">{t('txform.timeOptional')}</span>
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
          {t('txform.note')}{' '}
          <span className="mf-field__optional">
            {type === 'ADJUSTMENT' ? t('txform.noteRequired') : t('txform.noteOptional')}
          </span>
        </label>
        <input
          id="transaction-note"
          className="mf-input"
          type="text"
          maxLength={500}
          placeholder={t('txform.notePlaceholder')}
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
          {saving ? t('txform.saving') : transaction ? t('txform.saveChanges') : t('txform.save')}
        </Button>
        {onCancel ? (
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            {t('common.cancel')}
          </Button>
        ) : null}
        <p className="mf-field__hint">
          {t('txform.timezoneNote', { timezone: preferences.timezone })}
        </p>
      </div>
    </form>
  );
}
