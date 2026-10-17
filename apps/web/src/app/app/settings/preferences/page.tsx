import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';

export const metadata: Metadata = {
  title: 'Preferences — MoneyFlow UI preview',
  description:
    'Theme, locale, currency, and format preferences — preview only. No preference is saved yet.',
};

/**
 * A preference this page names but cannot yet change. `state` is the honest
 * status today: `Works locally` is real behaviour, `Proposed`/`Awaiting
 * decision` are unconfirmed open decisions (requirements.md §18) and must not
 * be presented as settled defaults.
 */
type PlannedPreference = {
  readonly name: string;
  readonly state: 'Works locally' | 'Proposed' | 'Awaiting decision';
  readonly scope: string;
};

const PLANNED_PREFERENCES: readonly PlannedPreference[] = [
  {
    name: 'Theme',
    state: 'Works locally',
    scope: 'Light or dark. Stored in this browser only, not on an account.',
  },
  {
    name: 'Currency',
    state: 'Proposed',
    scope:
      'BDT (৳) is the planned MVP currency and is stored explicitly so other currencies stay possible later. Not confirmed.',
  },
  {
    name: 'Locale',
    state: 'Awaiting decision',
    scope:
      'Bangla and English labels are planned; the launch locale pairs with the launch geography decision.',
  },
  {
    name: 'Timezone',
    state: 'Awaiting decision',
    scope:
      'Reporting periods and budget periods will use your timezone. Asia/Dhaka is the expected default, not agreed yet.',
  },
  {
    name: 'Week start',
    state: 'Awaiting decision',
    scope:
      'Saturday is proposed for Bangladesh; it changes weekly summaries and budget periods, so it is not guessed here.',
  },
  {
    name: 'Date and number format',
    state: 'Awaiting decision',
    scope: 'Day/month order and digit grouping, including Bangla numerals, are undecided.',
  },
];

/**
 * Preferences route (requirements.md §4.3 `/app/settings/preferences`, §5.2).
 * The theme control is the only genuinely working preference in this preview,
 * and it says where it is stored. Every other preference is listed with its
 * real decision status instead of a control that would silently do nothing
 * (AGENTS.md rule 12).
 */
export default function PreferencesPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Preferences</h1>
          <p className="mf-page-header__subtitle">
            Theme, locale, currency, and formats — what works today and what still needs a decision.
          </p>
        </div>
      </header>

      <Card title="Appearance" subtitle="The one preference that works in this preview">
        <div className="mf-empty">
          <p className="mf-empty__title">Theme switches from the top bar on every app page</p>
          <p className="mf-empty__text">
            The theme control in the header cycles System, Light, and Dark. It applies immediately
            and this browser remembers your choice through local storage, so it is already a real
            preference — it just is not tied to an account yet. A second copy of the same control
            here could disagree with the header, so the header keeps the single control until
            preferences are saved server-side.
          </p>
        </div>
      </Card>

      <Card title="Locale, currency, and formats" subtitle="Status of every planned preference">
        <ul className="mf-roadmap">
          {PLANNED_PREFERENCES.map((preference) => (
            <li key={preference.name} className="mf-roadmap__row">
              <span className="mf-roadmap__level">{preference.name}</span>
              <span className="mf-roadmap__state">{preference.state}</span>
              <span className="mf-roadmap__scope">{preference.scope}</span>
            </li>
          ))}
        </ul>
        <p className="mf-chart-note">
          Preferences are saved server-side per user once the preferences API and authentication
          land. Nothing on this page is stored, and the theme choice is browser-only.
        </p>
      </Card>

      <aside className="mf-status-note" role="note" aria-label="Why preferences are not editable">
        <p className="mf-status-note__title">No preference is saved to an account yet</p>
        <p className="mf-status-note__body">
          This preview has no signed-in user, so there is nowhere to store a locale or currency
          choice. Controls that looked saved but were not would be misleading, so each preference
          above shows its real status instead. Undecided defaults stay undecided until the product
          owner confirms them.
        </p>
      </aside>
    </AppShell>
  );
}
