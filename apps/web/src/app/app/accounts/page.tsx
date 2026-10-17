import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { Button } from '@/components/ui/button';
import { formatBdt } from '@/lib/format';
import { MOCK_ACCOUNTS } from '@/lib/mock-data';

export const metadata: Metadata = {
  title: 'Accounts — MoneyFlow UI preview',
};

/**
 * Accounts route (requirements.md §4.3, §5.3). Layout preview only: sample
 * accounts with kinds, currencies, opening balances, and active/archived
 * status. Current balances are NOT shown — they are computed from opening
 * balances plus recorded activity by the backend (IT-4), and no activity
 * exists in this preview. Creation/archiving actions stay disabled until the
 * accounts API lands. Shell banner keeps the sample labelling honest.
 */
export default function AccountsPage() {
  const active = MOCK_ACCOUNTS.filter((account) => account.status === 'active');
  const archived = MOCK_ACCOUNTS.filter((account) => account.status === 'archived');

  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Accounts</h1>
          <p className="mf-page-header__subtitle">
            Cash, bank, and wallet balances you track — sample accounts for this preview.
          </p>
        </div>
        <Button disabled aria-disabled="true" title="Account creation connects with IT-4">
          New account
        </Button>
      </header>

      <Card title="Active accounts" subtitle="Sample accounts">
        <ul className="mf-account-list">
          {active.map((account) => (
            <li key={account.id} className="mf-account">
              <div>
                <p className="mf-account__name">{account.name}</p>
                <p className="mf-account__meta">
                  {account.kind} · {account.currency}
                </p>
              </div>
              <div className="mf-account__figures">
                <p className="mf-account__amount">{formatBdt(account.openingBalance)}</p>
                <p className="mf-account__meta">Opening balance</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mf-chart-note">
          Balances shown are opening balances. Current balances are computed from the opening
          balance plus your recorded activity once the accounts backend lands — nothing is editable
          here.
        </p>
      </Card>

      <Card title="Archived" subtitle="History is preserved">
        <ul className="mf-account-list">
          {archived.map((account) => (
            <li key={account.id} className="mf-account">
              <div>
                <p className="mf-account__name">{account.name}</p>
                <p className="mf-account__meta">
                  {account.kind} · {account.currency} · Archived
                </p>
              </div>
              <div className="mf-account__figures">
                <p className="mf-account__amount">{formatBdt(account.openingBalance)}</p>
                <p className="mf-account__meta">Opening balance</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mf-chart-note">
          Archiving hides an account from active use without erasing its history.
        </p>
      </Card>
    </AppShell>
  );
}
