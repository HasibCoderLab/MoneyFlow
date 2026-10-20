import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { PreferencesForm } from '@/components/preferences-form';

export const metadata: Metadata = {
  title: 'Preferences — MoneyFlow',
  description:
    'Theme, language, timezone, week start, date and number formats, and reduced motion — saved to your account.',
};

/**
 * Preferences route (requirements.md §4.3 `/app/settings/preferences`, §5.2,
 * §5.7). Values are stored server-side per user through the IT-11 API and
 * reconciled with the browser cache by the preferences provider. Currency is
 * shown read-only: BDT is the only MVP currency and no conversion exists.
 */
export default function PreferencesPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Preferences</h1>
          <p className="mf-page-header__subtitle">
            Display and reporting preferences saved to your account.
          </p>
        </div>
      </header>

      <Card
        title="Your preferences"
        subtitle="Applied across the dashboard, reports, budgets, and goals"
      >
        <PreferencesForm />
      </Card>

      <p className="mf-chart-note">
        Preferences change presentation and reporting boundaries only. They never edit or convert
        recorded financial data.
      </p>
    </AppShell>
  );
}
