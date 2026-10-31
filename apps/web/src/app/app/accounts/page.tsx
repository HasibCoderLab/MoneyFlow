import type { Metadata } from 'next';

import { AccountsView } from '@/components/accounts-view';
import { AppShell } from '@/components/app-shell';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Accounts — MoneyFlow',
  description: 'Your cash, bank, mobile-wallet, and savings accounts with server-derived balances.',
};

/**
 * Accounts route (requirements.md §4.3, §5.3). The view reads the IT-4
 * accounts API: active and archived accounts, opening balances, and the
 * current balance derived by the server. Create, rename, opening-balance
 * edits (only before activity), and archive/unarchive all persist.
 */
export default function AccountsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="accounts.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="accounts.subtitle" />
          </p>
        </div>
      </header>

      <AccountsView />
    </AppShell>
  );
}
