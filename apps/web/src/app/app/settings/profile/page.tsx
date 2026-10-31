import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { I18nText } from '@/components/i18n-text';
import { ProfileForm } from '@/components/profile-form';

export const metadata: Metadata = {
  title: 'Profile — MoneyFlow',
  description: 'Your MoneyFlow display name and sign-in identity.',
};

/**
 * Profile route (requirements.md §4.3 `/app/settings/profile`, §5.2).
 * Display name is loaded and saved through the authenticated `GET/PATCH
 * /api/v1/me` endpoints (wired in IT-11). Email is shown read-only; identity
 * is always derived server-side from the verified session.
 */
export default function ProfilePage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="profile.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="profile.subtitle" />
          </p>
        </div>
      </header>

      <Card
        title={<I18nText k="profile.cardTitle" />}
        subtitle={<I18nText k="profile.cardSubtitle" />}
      >
        <ProfileForm />
      </Card>
    </AppShell>
  );
}
