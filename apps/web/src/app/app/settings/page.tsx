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
    description:
      'Authentication and server-enforced sessions are live; session management and password recovery are not built yet.',
  },
  {
    label: 'Data',
    href: '/app/settings/data',
    description:
      'Your recorded data exists; CSV export and account deletion are not built yet, so nothing is exported or deleted here.',
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
          Authentication is live and enforced by the server. Session management, password recovery,
          CSV export, and account deletion remain unbuilt and are never presented as operational.
        </p>
      </Card>
    </AppShell>
  );
}
