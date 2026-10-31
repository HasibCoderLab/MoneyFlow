import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { DeleteAccountControl, ExportTransactionsControl } from '@/components/data-controls';
import { I18nText } from '@/components/i18n-text';

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
          <h1>
            <I18nText k="data.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="data.subtitle" />
          </p>
        </div>
      </header>

      <Card
        title={<I18nText k="data.exportTitle" />}
        subtitle={<I18nText k="data.exportSubtitle" />}
      >
        <p className="mf-empty__text">
          <I18nText k="data.exportBody" />
        </p>
        <ExportTransactionsControl />
      </Card>

      <Card
        title={<I18nText k="data.deleteTitle" />}
        subtitle={<I18nText k="data.deleteSubtitle" />}
      >
        <p className="mf-empty__text">
          <I18nText k="data.deleteBody" />
        </p>
        <DeleteAccountControl />
      </Card>

      <Card title={<I18nText k="data.auditTitle" />} subtitle={<I18nText k="data.auditSubtitle" />}>
        <p className="mf-empty__text">
          <I18nText k="data.auditBody" />
        </p>
        <p className="mf-chart-note">
          <I18nText k="data.auditNote" />
        </p>
      </Card>
    </AppShell>
  );
}
