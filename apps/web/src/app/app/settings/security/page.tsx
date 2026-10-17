import type { Metadata } from 'next';
import Link from 'next/link';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';

export const metadata: Metadata = {
  title: 'Security — MoneyFlow UI preview',
  description:
    'Sessions, password, and account protection — not built yet. Nothing to manage in this preview.',
};

type PlannedControl = {
  readonly name: string;
  readonly scope: string;
};

const PLANNED_CONTROLS: readonly PlannedControl[] = [
  {
    name: 'Password change',
    scope:
      'Passwords will be hashed with a current algorithm and never stored or logged in plain text.',
  },
  {
    name: 'Active sessions',
    scope: 'List where you are signed in and end a session you do not recognise.',
  },
  {
    name: 'Sign out everywhere',
    scope: 'End every session at once when you think an account is at risk.',
  },
  {
    name: 'Email verification and recovery',
    scope:
      'Confirm your address and regain access — planned, waiting on an email provider decision.',
  },
];

/**
 * Security route (requirements.md §4.3 `/app/settings/security`, §5.1). There
 * is no account, session, or password in this build, so the page says exactly
 * that and lists the controls that will exist. No sign-out or "end sessions"
 * button is rendered: a control with nothing behind it would look functional
 * and do nothing (AGENTS.md rule 12).
 */
export default function SecurityPage() {
  return (
    <AppShell>
      <header className="mf-page-header">
        <div>
          <h1>Security</h1>
          <p className="mf-page-header__subtitle">
            Sessions, password, and account protection — none of it exists yet.
          </p>
        </div>
      </header>

      <Card title="Your security controls" subtitle="Empty because there is no account yet">
        <div className="mf-empty">
          <p className="mf-empty__title">Nothing to manage here</p>
          <p className="mf-empty__text">
            Authentication is not connected in this preview, so there is no account, no session, and
            no password to change. Nothing you type anywhere in this build is sent, stored, or
            logged. Sign up and sign in are{' '}
            <Link className="mf-card__action" href="/sign-in">
              visible previews
            </Link>{' '}
            with submit deliberately disabled.
          </p>
        </div>
      </Card>

      <Card title="Planned controls" subtitle="Each arrives with its real backend flow">
        <ul className="mf-roadmap">
          {PLANNED_CONTROLS.map((control) => (
            <li key={control.name} className="mf-roadmap__row">
              <span className="mf-roadmap__level">{control.name}</span>
              <span className="mf-roadmap__state">Planned</span>
              <span className="mf-roadmap__scope">{control.scope}</span>
            </li>
          ))}
        </ul>
      </Card>

      <aside className="mf-status-note" role="note" aria-label="How security will be handled">
        <p className="mf-status-note__title">
          Security is enforced by the server, never by hiding pages
        </p>
        <p className="mf-status-note__body">
          Every private record will be checked against the signed-in user on the server, so a page
          being hidden or a button being disabled never protects anything by itself. Sensitive
          actions will ask you to confirm again, and sign-in problems will be described in general
          terms so the page cannot be used to discover which email addresses have accounts.
        </p>
      </aside>
    </AppShell>
  );
}
