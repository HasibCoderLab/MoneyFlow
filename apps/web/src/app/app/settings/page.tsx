import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';

export const metadata: Metadata = {
  title: 'Settings — MoneyFlow',
};

/** One settings section from the information architecture (requirements.md §4.3). */
type SettingsSection = {
  readonly label: string;
  readonly href: string;
  /** What the section actually does today — never a promise of saved data. */
  readonly description: string;
};

const SECTIONS: readonly SettingsSection[] = [
  {
    label: 'Profile',
    href: '/app/settings/profile',
    description: 'Display name, loaded from and saved to your account.',
  },
  {
    label: 'Preferences',
    href: '/app/settings/preferences',
    description:
      'Theme, language, timezone, week start, date/number formats, and reduced motion — saved per user.',
  },
  {
    label: 'Dashboard layout',
    href: '/app/customize',
    description: 'Show, hide, reorder, or reset the dashboard widgets saved to your account.',
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
 * Settings index (requirements.md §4.3). Profile, preferences, and the
 * dashboard layout are wired to authenticated APIs (IT-3/IT-11); security and
 * data remain honest previews for IT-12/IT-13.
 */
export default function SettingsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Settings</h1>
          <p className="mf-page-header__subtitle">
            Profile, preferences, and customization saved to your account.
          </p>
        </div>
      </header>

      <Card title="Sections" subtitle="What each section does today">
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
          Security and data controls remain previews until their assigned tasks. They are never
          presented as operational before then.
        </p>
      </Card>
    </AppShell>
  );
}
