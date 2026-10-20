'use client';

import { useCallback, useState } from 'react';
import type { AccountResponse, AccountType } from '@moneyflow/contracts';

import { Card } from '@/components/card';
import { SummaryError, SummaryLoading, SummarySignedOut } from '@/components/summary-states';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import {
  ApiClientError,
  createAccount,
  fetchAccounts,
  moveAccount,
  updateAccount,
} from '@/lib/api-client';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPES } from '@/lib/account-labels';
import { useLocale } from '@/lib/i18n/locale-context';
import { formatBdtMinor } from '@/lib/money-format';
import { minorToDecimalInput } from '@/lib/goals-format';
import { isValidOpeningBalance } from '@/lib/transaction-input';
import { useAsyncData } from '@/lib/use-async-data';

/**
 * Accounts list (requirements.md §5.3, IT-4 API).
 *
 * Every balance is rendered exactly as the server derived it from the
 * opening balance plus recorded transactions. Create, rename, and archive
 * talk to the authenticated API; the browser never edits a computed balance
 * directly. Opening balances are editable only while the server reports no
 * activity, and the server enforces the same rule.
 */
export function AccountsView() {
  const loadAccounts = useCallback(() => fetchAccounts(), []);
  const { state, retry } = useAsyncData(loadAccounts);

  const [formAccount, setFormAccount] = useState<AccountResponse | null | undefined>(undefined);
  const [archiveTarget, setArchiveTarget] = useState<AccountResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runMove = useCallback(
    async (account: AccountResponse) => {
      setActionError(null);
      try {
        await moveAccount(account.id, account.status === 'ACTIVE' ? 'archive' : 'unarchive');
        setArchiveTarget(null);
        retry();
      } catch (error) {
        setActionError(
          error instanceof ApiClientError ? error.message : 'Could not update the account.',
        );
      }
    },
    [retry],
  );

  let content;
  if (state.status === 'loading') {
    content = <SummaryLoading />;
  } else if (state.status === 'signedOut') {
    content = <SummarySignedOut />;
  } else if (state.status === 'error') {
    content = <SummaryError onRetry={retry} />;
  } else if (state.data.length === 0) {
    content = (
      <div className="mf-empty">
        <p className="mf-empty__title">No accounts yet</p>
        <p className="mf-empty__text">
          Add the cash, bank, or mobile-wallet accounts you want to track. Balances start from the
          opening balance you enter and update as you record transactions.
        </p>
        <Button onClick={() => setFormAccount(null)}>Add your first account</Button>
      </div>
    );
  } else {
    const active = state.data.filter((account) => account.status === 'ACTIVE');
    const archived = state.data.filter((account) => account.status === 'ARCHIVED');
    content = (
      <>
        <Card title="Active accounts" subtitle={`${active.length} in use`}>
          {active.length === 0 ? (
            <p className="mf-empty__text">
              No active accounts. Unarchive one below or add a new account.
            </p>
          ) : (
            <ul className="mf-account-list">
              {active.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onEdit={() => setFormAccount(account)}
                  onArchive={() => setArchiveTarget(account)}
                />
              ))}
            </ul>
          )}
        </Card>

        {archived.length > 0 ? (
          <Card title="Archived" subtitle="History is preserved">
            <ul className="mf-account-list">
              {archived.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onEdit={() => setFormAccount(account)}
                  onArchive={() => void runMove(account)}
                />
              ))}
            </ul>
            <p className="mf-chart-note">
              Archived accounts keep their recorded history and stay visible here. They cannot be
              used for new transactions.
            </p>
          </Card>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="mf-summary-meta">
        <Button onClick={() => setFormAccount(null)}>New account</Button>
        <p className="mf-chart-note">Balances are computed by the server from your records.</p>
      </div>

      {actionError ? (
        <p className="mf-form__error" role="alert">
          {actionError}
        </p>
      ) : null}

      {content}

      <p className="mf-chart-note">
        Opening balances are not income. They only set the starting point of an account; income and
        spending come from your recorded transactions.
      </p>

      {formAccount !== undefined ? (
        <AccountFormDialog
          account={formAccount}
          onClose={() => setFormAccount(undefined)}
          onSaved={() => {
            setFormAccount(undefined);
            retry();
          }}
        />
      ) : null}

      {archiveTarget ? (
        <Dialog
          open
          title="Archive this account?"
          description={`${archiveTarget.name} will disappear from active use. Its balance, opening balance, and recorded transaction history stay intact, and it can be unarchived at any time.`}
          onClose={() => setArchiveTarget(null)}
        >
          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={() => void runMove(archiveTarget)}>Archive account</Button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}

function AccountRow({
  account,
  onEdit,
  onArchive,
}: {
  readonly account: AccountResponse;
  readonly onEdit: () => void;
  readonly onArchive: () => void;
}) {
  const { preferences } = useLocale();
  const archived = account.status === 'ARCHIVED';

  return (
    <li className="mf-account">
      <div>
        <p className="mf-account__name">{account.name}</p>
        <p className="mf-account__meta">
          {ACCOUNT_TYPE_LABEL[account.type]} · {account.currency}
          {archived ? ' · Archived' : ''}
        </p>
      </div>
      <div className="mf-account__figures">
        <p className="mf-account__amount">{formatBdtMinor(account.balanceMinor, preferences)}</p>
        <p className="mf-account__meta">
          Opening {formatBdtMinor(account.openingBalanceMinor, preferences)}
        </p>
        <div className="mf-account__actions">
          <Button variant="ghost" onClick={onEdit} aria-label={`Edit ${account.name}`}>
            Edit
          </Button>
          <Button
            variant="ghost"
            onClick={onArchive}
            aria-label={`${archived ? 'Unarchive' : 'Archive'} ${account.name}`}
          >
            {archived ? 'Unarchive' : 'Archive'}
          </Button>
        </div>
      </div>
    </li>
  );
}

type AccountErrors = {
  name?: string;
  opening?: string;
};

function AccountFormDialog({
  account,
  onClose,
  onSaved,
}: {
  readonly account: AccountResponse | null;
  readonly onClose: () => void;
  readonly onSaved: () => void;
}) {
  const hasActivity = account !== null && account.balanceMinor !== account.openingBalanceMinor;
  const canEditOpening = account === null || !hasActivity;

  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'CASH');
  const [opening, setOpening] = useState(
    account ? minorToDecimalInput(account.openingBalanceMinor) : '0',
  );
  const [errors, setErrors] = useState<AccountErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const next: AccountErrors = {};
    const trimmed = name.trim();
    if (trimmed.length === 0) next.name = 'Enter an account name.';
    else if (trimmed.length > 80) next.name = 'Use at most 80 characters.';
    if (canEditOpening && !isValidOpeningBalance(opening.trim())) {
      next.opening = 'Use a signed amount with at most 2 decimals, e.g. 0 or 3500.50.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setServerError(null);
    try {
      if (account === null) {
        await createAccount({
          name: trimmed,
          type,
          currency: 'BDT',
          openingBalance: opening.trim(),
        });
      } else {
        await updateAccount(account.id, {
          name: trimmed,
          ...(canEditOpening && opening.trim() !== minorToDecimalInput(account.openingBalanceMinor)
            ? { openingBalance: opening.trim() }
            : {}),
        });
      }
      onSaved();
    } catch (error) {
      setServerError(
        error instanceof ApiClientError ? error.message : 'Could not save the account. Try again.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      title={account ? 'Edit account' : 'New account'}
      onClose={onClose}
      description={
        account
          ? 'The account kind cannot change after creation. Archived accounts stay editable.'
          : 'Choose a name and the balance the account holds today. You can change the opening balance until the account has activity.'
      }
    >
      <form
        className="mf-form"
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

        <label className="mf-field">
          <span className="mf-field__label">Account name</span>
          <input
            className="mf-input"
            value={name}
            maxLength={80}
            autoComplete="off"
            onChange={(event) => setName(event.target.value)}
            aria-invalid={errors.name !== undefined}
          />
          {errors.name ? <span className="mf-form__error">{errors.name}</span> : null}
        </label>

        <label className="mf-field">
          <span className="mf-field__label">Account kind</span>
          <select
            className="mf-input"
            value={type}
            disabled={account !== null}
            onChange={(event) => setType(event.target.value as AccountType)}
          >
            {ACCOUNT_TYPES.map((value) => (
              <option key={value} value={value}>
                {ACCOUNT_TYPE_LABEL[value]}
              </option>
            ))}
          </select>
          {account ? <span className="mf-field__hint">Kind is fixed after creation.</span> : null}
        </label>

        <div className="mf-field">
          <span className="mf-field__label">Currency</span>
          <p className="mf-field__hint">BDT only in this build; no conversion is performed.</p>
        </div>

        <label className="mf-field">
          <span className="mf-field__label">Opening balance (BDT)</span>
          <input
            className="mf-input"
            inputMode="decimal"
            value={opening}
            disabled={!canEditOpening}
            onChange={(event) => setOpening(event.target.value)}
            aria-invalid={errors.opening !== undefined}
          />
          {errors.opening ? <span className="mf-form__error">{errors.opening}</span> : null}
          {!canEditOpening ? (
            <span className="mf-field__hint">
              This account already has recorded activity, so its opening balance is fixed. Record an
              adjustment transaction instead.
            </span>
          ) : null}
        </label>

        <div className="mf-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save account'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
