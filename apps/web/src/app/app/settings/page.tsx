import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';

export const metadata: Metadata = {
  title: 'Settings — MoneyFlow UI preview',
};

/** One settings section from the information architecture (requirements.md §4.3). */
type SettingsSection = {
  readonly label: string;
  readonly href: string;
  /** What the section actually shows today — never a promise of saved data. */
  readonly description: string;
};

const SECTIONS: readonly SettingsSection[] = [
  {
    label: 'Profile',
    href: '/app/settings/profile',
    description: 'Display name preview with local validation — saving is not connected.',
  },
  {
    label: 'Preferences',
    href: '/app/settings/preferences',
    description: 'Theme works in this browser; locale, currency, and formats await decisions.',
  },
  {
    label: 'Security',
    href: '/app/settings/security',
    description: 'Sessions, password, and recovery — there is no account or session yet.',
  },
  {
    label: 'Data',
    href: '/app/settings/data',
    description: 'Export, deletion, and retention — nothing is recorded to export or delete yet.',
  },
];

/**
 * Settings index (requirements.md §4.3). Every section in the information
 * architecture is linked to a real preview route; each preview states plainly
 * what it does and does not do. Nothing on these pages is saved, because there
 * is no signed-in user or preferences API yet (IT-11/IT-12/IT-13).
 */
export default function SettingsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Settings</h1>
          <p className="mf-page-header__subtitle">
            Profile, preferences, security, and your data — what exists so far.
          </p>
        </div>
      </header>

      <Card title="Sections" subtitle="Four previews, no saved settings yet">
        <ul className="mf-report-list">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link className="mf-card__action" href={section.href}>
                {section.label}
              </Link>{' '}
              — {section.description}
            </li>
          ))}
        </ul>
        <p className="mf-chart-note">
          Settings are saved server-side per user once authentication lands. Nothing here is stored
          yet, and no section claims otherwise.
        </p>
      </Card>
    </AppShell>
  );
}
