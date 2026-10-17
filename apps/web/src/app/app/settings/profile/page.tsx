import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { ProfileForm } from '@/components/profile-form';

export const metadata: Metadata = {
  title: 'Profile — MoneyFlow UI preview',
};

/**
 * Profile route (requirements.md §4.3 `/app/settings/profile`, §5.2).
 * Form foundation only: display-name editing UI with live validation.
 * Saving stays disabled until the profile API (IT-11) lands — there is no
 * signed-in user and no persistence in this preview. Reachable directly by
 * URL until the settings index links it.
 */
export default function ProfilePage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Profile</h1>
          <p className="mf-page-header__subtitle">
            How MoneyFlow addresses you — layout preview with a sample name.
          </p>
        </div>
      </header>

      <Card title="Display name" subtitle="Sample profile">
        <ProfileForm />
      </Card>
    </AppShell>
  );
}
