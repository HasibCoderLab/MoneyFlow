import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { I18nText } from '@/components/i18n-text';
import type { TranslationKey } from '@/lib/i18n/translations';

export const metadata: Metadata = {
  title: 'Settings — MoneyFlow',
};

/** One settings section from the information architecture (requirements.md §4.3). */
type SettingsSection = {
  readonly labelKey: TranslationKey;
  readonly href: string;
  /** What the section actually does today — never a promise of saved data. */
  readonly descriptionKey: TranslationKey;
};

const SECTIONS: readonly SettingsSection[] = [
  {
    labelKey: 'settings.section.profile.label',
    href: '/app/settings/profile',
    descriptionKey: 'settings.section.profile.body',
  },
  {
    labelKey: 'settings.section.preferences.label',
    href: '/app/settings/preferences',
    descriptionKey: 'settings.section.preferences.body',
  },
  {
    labelKey: 'settings.section.layout.label',
    href: '/app/customize',
    descriptionKey: 'settings.section.layout.body',
  },
  {
    labelKey: 'settings.section.security.label',
    href: '/app/settings/security',
    descriptionKey: 'settings.section.security.body',
  },
  {
    labelKey: 'settings.section.data.label',
    href: '/app/settings/data',
    descriptionKey: 'settings.section.data.body',
  },
];

/**
 * Settings index (requirements.md §4.3). Profile, preferences, layout, and
 * data controls are wired to authenticated APIs (IT-3/IT-11/IT-12); security
 * still states plainly that session management and password recovery are not
 * built (IT-13).
 */
export default function SettingsPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="settings.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="settings.subtitle" />
          </p>
        </div>
      </header>

      <Card
        title={<I18nText k="settings.sectionsTitle" />}
        subtitle={<I18nText k="settings.sectionsSubtitle" />}
      >
        <ul className="mf-report-list">
          {SECTIONS.map((section) => (
            <li key={section.href}>
              <Link className="mf-card__action" href={section.href}>
                <I18nText k={section.labelKey} />
              </Link>{' '}
              — <I18nText k={section.descriptionKey} />
            </li>
          ))}
        </ul>
        <p className="mf-chart-note">
          <I18nText k="settings.note" />
        </p>
      </Card>
    </AppShell>
  );
}
