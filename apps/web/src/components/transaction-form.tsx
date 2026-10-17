'use client';

import { useEffect, useId, useState } from 'react';

import { Button } from '@/components/ui/button';

/**
 * Transaction entry form — UI FOUNDATION ONLY (preview, IT-6 wires saving).
 *
 * What this is: layout, labels, and client-side validation for the future
 * transaction workflow (requirements.md §5.4, §7.5). Every option below is a
 * hand-written sample labelled as such; nothing is fetched, calculated, or
 * stored. The submit button stays disabled with an explicit reason until the
 * `POST /api/v1/transactions` integration lands — a visibly non-operational
 * control is honest, a fake success would not be (AGENTS.md rule 12).
 *
 * TODO(IT-6): replace SAMPLE_* with API data, enable submit, POST the
 * payload, then handle pending/success/error per §12 of the master prompt.
 */

type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

const SAMPLE_ACCOUNTS = ['Cash (sample)', 'Bank account (sample)', 'Mobile wallet (sample)'];

const SAMPLE_CATEGORIES: Record<Exclude<TransactionType, 'TRANSFER'>, readonly string[]> = {
  INCOME: ['Salary (sample)', 'Freelance (sample)', 'Gifts (sample)'],
  EXPENSE: ['Groceries (sample)', 'Transport (sample)', 'Utilities (sample)', 'Food (sample)'],
};

const AMOUNT_PATTERN = /^(0|[1-9][0-9]*)(\.[0-9]{1,2})?$/;

function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

type FieldErrors = {
  amount?: string;
  account?: string;
  toAccount?: string;
  category?: string;
  date?: string;
};

export function TransactionForm() {
  const [type, setType] = useState<TransactionType>('EXPENSE');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState(false);
  const baseId = useId();

  // Default to today on the client only — avoids a server/client date mismatch.
  useEffect(() => {
    setDate((current) => current || todayLocal());
  }, []);

  const errors: FieldErrors = {};
  if (touched || amount) {
    if (!amount) errors.amount = 'Enter an amount greater than zero.';
    else if (!AMOUNT_PATTERN.test(amount.trim()))
      errors.amount = 'Use digits with at most 2 decimals, e.g. 3500 or 3500.50.';
    else if (Number(amount) <= 0) errors.amount = 'Amount must be greater than zero.';
  }
  if (touched && !account) errors.account = 'Choose an account.';
  if (type === 'TRANSFER') {
    if (touched && !toAccount) errors.toAccount = 'Choose a destination account.';
    else if (toAccount && account && toAccount === account)
      errors.toAccount = 'Destination must differ from the source account.';
  } else if (touched && !category) {
    errors.category = 'Choose a category.';
  }
  if (touched && !date) errors.date = 'Choose a date.';
  else if (date && date > todayLocal())
    errors.date = 'Future dates are not accepted; record planned spending later.';

  const fieldId = (name: string) => `${baseId}-${name}`;
  const errorId = (name: string) => `${baseId}-${name}-error`;

  return (
    <form
      className="mf-form"
      noValidate
      aria-describedby={`${baseId}-preview-note`}
      onSubmit={(event) => event.preventDefault()}
    >
      <fieldset className="mf-field">
        <legend className="mf-field__label">Type</legend>
        <div className="mf-radio-row" role="radiogroup" aria-label="Transaction type">
          {(['INCOME', 'EXPENSE', 'TRANSFER'] as const).map((value) => (
            <label key={value} className="mf-radio">
              <input
                type="radio"
                name={`${baseId}-type`}
                value={value}
                checked={type === value}
                onChange={() => {
                  setType(value);
                  setCategory('');
                  setToAccount('');
                }}
              />
              <span>
                {value === 'INCOME' ? 'Money in' : value === 'EXPENSE' ? 'Money out' : 'Transfer'}
              </span>
            </label>
          ))}
        </div>
        <p className="mf-field__hint">
          Transfers move money between your own accounts — never counted as income or spending.
        </p>
      </fieldset>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor={fieldId('amount')}>
          Amount (BDT)
        </label>
        <input
          id={fieldId('amount')}
          className="mf-input"
          inputMode="decimal"
          autoComplete="off"
          placeholder="e.g. 3500.50"
          value={amount}
          aria-invalid={errors.amount ? true : undefined}
          aria-describedby={errors.amount ? errorId('amount') : undefined}
          onChange={(event) => setAmount(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {errors.amount ? (
          <p id={errorId('amount')} className="mf-field__error" role="alert">
            {errors.amount}
          </p>
        ) : null}
      </div>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor={fieldId('account')}>
          {type === 'TRANSFER' ? 'From account' : 'Account'}
        </label>
        <select
          id={fieldId('account')}
          className="mf-input"
          value={account}
          aria-invalid={errors.account ? true : undefined}
          aria-describedby={errors.account ? errorId('account') : undefined}
          onChange={(event) => setAccount(event.target.value)}
          onBlur={() => setTouched(true)}
        >
          <option value="">Select an account</option>
          {SAMPLE_ACCOUNTS.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {errors.account ? (
          <p id={errorId('account')} className="mf-field__error" role="alert">
            {errors.account}
          </p>
        ) : null}
      </div>

      {type === 'TRANSFER' ? (
        <div className="mf-field">
          <label className="mf-field__label" htmlFor={fieldId('to-account')}>
            To account
          </label>
          <select
            id={fieldId('to-account')}
            className="mf-input"
            value={toAccount}
            aria-invalid={errors.toAccount ? true : undefined}
            aria-describedby={errors.toAccount ? errorId('to-account') : undefined}
            onChange={(event) => setToAccount(event.target.value)}
            onBlur={() => setTouched(true)}
          >
            <option value="">Select a destination</option>
            {SAMPLE_ACCOUNTS.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {errors.toAccount ? (
            <p id={errorId('to-account')} className="mf-field__error" role="alert">
              {errors.toAccount}
            </p>
          ) : null}
        </div>
      ) : (
        <div className="mf-field">
          <label className="mf-field__label" htmlFor={fieldId('category')}>
            Category
          </label>
          <select
            id={fieldId('category')}
            className="mf-input"
            value={category}
            aria-invalid={errors.category ? true : undefined}
            aria-describedby={errors.category ? errorId('category') : undefined}
            onChange={(event) => setCategory(event.target.value)}
            onBlur={() => setTouched(true)}
          >
            <option value="">Select a category</option>
            {SAMPLE_CATEGORIES[type].map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          {errors.category ? (
            <p id={errorId('category')} className="mf-field__error" role="alert">
              {errors.category}
            </p>
          ) : null}
        </div>
      )}

      <div className="mf-field">
        <label className="mf-field__label" htmlFor={fieldId('date')}>
          Date
        </label>
        <input
          id={fieldId('date')}
          className="mf-input"
          type="date"
          value={date}
          aria-invalid={errors.date ? true : undefined}
          aria-describedby={errors.date ? errorId('date') : undefined}
          onChange={(event) => setDate(event.target.value)}
          onBlur={() => setTouched(true)}
        />
        {errors.date ? (
          <p id={errorId('date')} className="mf-field__error" role="alert">
            {errors.date}
          </p>
        ) : null}
      </div>

      <div className="mf-field">
        <label className="mf-field__label" htmlFor={fieldId('note')}>
          Note <span className="mf-field__optional">(optional)</span>
        </label>
        <input
          id={fieldId('note')}
          className="mf-input"
          type="text"
          maxLength={280}
          placeholder="e.g. Monthly groceries"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="mf-form__actions">
        <Button type="submit" disabled aria-disabled="true">
          Save transaction
        </Button>
        <p id={`${baseId}-preview-note`} className="mf-field__hint">
          Preview only — saving connects when the transaction API lands (IT-6). Nothing here is
          stored.
        </p>
      </div>
    </form>
  );
}
