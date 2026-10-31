import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { DashboardCustomizer } from '@/components/dashboard-customizer';
import { I18nText } from '@/components/i18n-text';

export const metadata: Metadata = {
  title: 'Customize dashboard — MoneyFlow',
  description: 'Show, hide, and reorder your dashboard widgets. Reset to the default at any time.',
};

/**
 * Dashboard customization route (IT-11, requirements.md §5.6/§5.7). The
 * saved layout is per user, validated server-side, and resettable. Mobile
 * users get the same controls in a single-column list.
 */
export default function CustomizeDashboardPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="customize.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="customize.subtitle" />
          </p>
        </div>
      </header>

      <Card
        title={<I18nText k="customize.cardTitle" />}
        subtitle={<I18nText k="customize.cardSubtitle" />}
      >
        <DashboardCustomizer />
      </Card>
    </AppShell>
  );
}
