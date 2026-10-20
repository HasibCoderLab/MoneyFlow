import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { DeleteAccountControl, ExportTransactionsControl } from '@/components/data-controls';

export const metadata: Metadata = {
  title: 'Your data — MoneyFlow',
  description: 'Download your transactions as CSV or permanently delete your MoneyFlow account.',
};

/**
 * Data route (requirements.md §4.3 `/app/settings/data`, §5.1, §10.3;
 * ADR-0011). Both controls are real: the CSV is streamed by the API from the
 * signed-in user's own rows, and deletion removes every owned row in one
 * transaction after password and phrase confirmation. Retention wording stays
 * limited to what the implementation can prove — backups are not claimed to
 * be erased.
 */
export default function DataSettingsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Your data</h1>
          <p className="mf-page-header__subtitle">
            Download your transactions, or permanently delete your MoneyFlow account.
          </p>
        </div>
      </header>

      <Card title="Export transactions" subtitle="CSV · generated from your own records">
        <p className="mf-empty__text">
          The export contains every transaction currently recorded in your account, newest first.
          Amounts keep their exact recorded value, dates are UTC, and text that a spreadsheet could
          treat as a formula is neutralized. Account and category names are included; internal
          database identifiers are not.
        </p>
        <ExportTransactionsControl />
      </Card>

      <Card title="Delete account" subtitle="Permanent · requires your password">
        <p className="mf-empty__text">
          Deletion removes your profile, financial accounts, transactions, categories, budgets,
          goals and contributions, preferences, dashboard layout, sign-in credentials, and every
          active session. Other people&apos;s records are never touched.
        </p>
        <DeleteAccountControl />
      </Card>

      <Card title="Retention and audit record" subtitle="Minimal, without financial content">
        <p className="mf-empty__text">
          Destructive actions and this export write a small audit event: the event type, your user
          id, and a resource identifier where one exists. Audit metadata never contains amounts,
          notes, passwords, tokens, or request bodies, and there is no public audit API. When you
          delete your account, the audit rows remain with the user link removed.
        </p>
        <p className="mf-chart-note">
          Deletion removes your live records. Infrastructure backups are not claimed to be erased
          here; they age out under the hosting provider&apos;s retention policy.
        </p>
      </Card>
    </AppShell>
  );
}
