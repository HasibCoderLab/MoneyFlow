import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { I18nText } from '@/components/i18n-text';
import { SignOutButton } from '@/components/sign-out-button';
import type { TranslationKey } from '@/lib/i18n/translations';

export const metadata: Metadata = {
  title: 'Security — MoneyFlow',
  description: 'Your active session and the security controls that are still planned.',
};

type PlannedControl = {
  readonly nameKey: TranslationKey;
  readonly scopeKey: TranslationKey;
};

const PLANNED_CONTROLS: readonly PlannedControl[] = [
  {
    nameKey: 'security.planned.sessions.name',
    scopeKey: 'security.planned.sessions.body',
  },
  {
    nameKey: 'security.planned.signOutAll.name',
    scopeKey: 'security.planned.signOutAll.body',
  },
  {
    nameKey: 'security.planned.password.name',
    scopeKey: 'security.planned.password.body',
  },
  {
    nameKey: 'security.planned.recovery.name',
    scopeKey: 'security.planned.recovery.body',
  },
];

/**
 * Security route (requirements.md §4.3 `/app/settings/security`, §5.1).
 * Authentication is live: email/password sessions are server-side, HttpOnly,
 * and enforced by a global guard. Signing out works; listing or ending other
 * sessions and password change are not built, so they are listed as planned
 * instead of rendered as non-functional controls.
 */
export default function SecurityPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>
            <I18nText k="security.title" />
          </h1>
          <p className="mf-page-header__subtitle">
            <I18nText k="security.subtitle" />
          </p>
        </div>
      </header>

      <Card
        title={<I18nText k="security.currentTitle" />}
        subtitle={<I18nText k="security.currentSubtitle" />}
      >
        <p className="mf-empty__text">
          <I18nText k="security.currentBody" />
        </p>
        <SignOutButton />
      </Card>

      <Card
        title={<I18nText k="security.plannedTitle" />}
        subtitle={<I18nText k="security.plannedSubtitle" />}
      >
        <ul className="mf-roadmap">
          {PLANNED_CONTROLS.map((control) => (
            <li key={control.nameKey} className="mf-roadmap__row">
              <span className="mf-roadmap__level">
                <I18nText k={control.nameKey} />
              </span>
              <span className="mf-roadmap__state">
                <I18nText k="security.plannedBadge" />
              </span>
              <span className="mf-roadmap__scope">
                <I18nText k={control.scopeKey} />
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <aside className="mf-status-note" role="note" aria-labelledby="security-note-title">
        <p id="security-note-title" className="mf-status-note__title">
          <I18nText k="security.noteTitle" />
        </p>
        <p className="mf-status-note__body">
          <I18nText k="security.noteBody" />
        </p>
      </aside>
    </AppShell>
  );
}
