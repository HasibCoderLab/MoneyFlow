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
import { ACCOUNT_TYPE_LABEL_KEY, ACCOUNT_TYPES } from '@/lib/account-labels';
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
  const { t } = useLocale();
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
        setActionError(error instanceof ApiClientError ? error.message : t('accounts.updateError'));
      }
    },
    [retry, t],
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
        <p className="mf-empty__title">{t('accounts.emptyTitle')}</p>
        <p className="mf-empty__text">{t('accounts.emptyBody')}</p>
        <Button onClick={() => setFormAccount(null)}>{t('accounts.addFirst')}</Button>
      </div>
    );
  } else {
    const active = state.data.filter((account) => account.status === 'ACTIVE');
    const archived = state.data.filter((account) => account.status === 'ARCHIVED');
    content = (
      <>
        <Card
          title={t('accounts.activeTitle')}
          subtitle={t('accounts.activeCount', { count: active.length })}
        >
          {active.length === 0 ? (
            <p className="mf-empty__text">{t('accounts.activeEmpty')}</p>
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
          <Card title={t('accounts.archivedTitle')} subtitle={t('accounts.archivedSubtitle')}>
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
            <p className="mf-chart-note">{t('accounts.archivedNote')}</p>
          </Card>
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="mf-summary-meta">
        <Button onClick={() => setFormAccount(null)}>{t('accounts.newButton')}</Button>
        <p className="mf-chart-note">{t('accounts.serverBalanceNote')}</p>
      </div>

      {actionError ? (
        <p className="mf-form__error" role="alert">
          {actionError}
        </p>
      ) : null}

      {content}

      <p className="mf-chart-note">{t('accounts.openingNote')}</p>

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
          title={t('accounts.archiveTitle')}
          description={t('accounts.archiveBody', { name: archiveTarget.name })}
          onClose={() => setArchiveTarget(null)}
        >
          <div className="mf-dialog__actions">
            <Button variant="ghost" onClick={() => setArchiveTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void runMove(archiveTarget)}>
              {t('accounts.archiveButton')}
            </Button>
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
  const { preferences, t } = useLocale();
  const archived = account.status === 'ARCHIVED';

  return (
    <li className="mf-account">
      <div>
        <p className="mf-account__name">{account.name}</p>
        <p className="mf-account__meta">
          {t(ACCOUNT_TYPE_LABEL_KEY[account.type])} · {account.currency}
          {archived ? ` · ${t('accounts.archivedBadge')}` : ''}
        </p>
      </div>
      <div className="mf-account__figures">
        <p className="mf-account__amount">{formatBdtMinor(account.balanceMinor, preferences)}</p>
        <p className="mf-account__meta">
          {t('accounts.openingLabel', {
            amount: formatBdtMinor(account.openingBalanceMinor, preferences),
          })}
        </p>
        <div className="mf-account__actions">
          <Button
            variant="ghost"
            onClick={onEdit}
            aria-label={t('accounts.editAria', { name: account.name })}
          >
            {t('common.edit')}
          </Button>
          <Button
            variant="ghost"
            onClick={onArchive}
            aria-label={
              archived
                ? t('accounts.unarchiveAria', { name: account.name })
                : t('accounts.archiveAria', { name: account.name })
            }
          >
            {archived ? t('accounts.unarchiveButton') : t('accounts.archiveButton')}
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
  const { t } = useLocale();
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
    if (trimmed.length === 0) next.name = t('accounts.nameRequired');
    else if (trimmed.length > 80) next.name = t('accounts.nameTooLong');
    if (canEditOpening && !isValidOpeningBalance(opening.trim())) {
      next.opening = t('accounts.openingError');
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
      setServerError(error instanceof ApiClientError ? error.message : t('accounts.saveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      title={account ? t('accounts.formEditTitle') : t('accounts.formNewTitle')}
      onClose={onClose}
      description={account ? t('accounts.formEditBody') : t('accounts.formNewBody')}
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
          <span className="mf-field__label">{t('accounts.nameLabel')}</span>
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
          <span className="mf-field__label">{t('accounts.kindLabel')}</span>
          <select
            className="mf-input"
            value={type}
            disabled={account !== null}
            onChange={(event) => setType(event.target.value as AccountType)}
          >
            {ACCOUNT_TYPES.map((value) => (
              <option key={value} value={value}>
                {t(ACCOUNT_TYPE_LABEL_KEY[value])}
              </option>
            ))}
          </select>
          {account ? <span className="mf-field__hint">{t('accounts.kindFixed')}</span> : null}
        </label>

        <div className="mf-field">
          <span className="mf-field__label">{t('accounts.currencyLabel')}</span>
          <p className="mf-field__hint">{t('accounts.currencyHint')}</p>
        </div>

        <label className="mf-field">
          <span className="mf-field__label">{t('accounts.openingLabelBdt')}</span>
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
            <span className="mf-field__hint">{t('accounts.openingFixed')}</span>
          ) : null}
        </label>

        <div className="mf-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? t('accounts.saving') : t('accounts.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
