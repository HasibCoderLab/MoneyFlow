import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/card';
import { SignOutButton } from '@/components/sign-out-button';

export const metadata: Metadata = {
  title: 'Security — MoneyFlow',
  description: 'Your active session and the security controls that are still planned.',
};

type PlannedControl = {
  readonly name: string;
  readonly scope: string;
};

const PLANNED_CONTROLS: readonly PlannedControl[] = [
  {
    name: 'Active sessions',
    scope: 'List where you are signed in and end a session you do not recognise.',
  },
  {
    name: 'Sign out everywhere',
    scope: 'End every session at once when you think an account is at risk.',
  },
  {
    name: 'Password change',
    scope:
      'Passwords are already hashed with Argon2id and never stored or logged in plain text; a change flow is not built yet.',
  },
  {
    name: 'Email verification and recovery',
    scope:
      'Confirm your address and regain access — planned, waiting on an email provider decision.',
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
          <h1>Security</h1>
          <p className="mf-page-header__subtitle">
            Your session today, and the controls that are still planned.
          </p>
        </div>
      </header>

      <Card title="Current session" subtitle="Server-enforced">
        <p className="mf-empty__text">
          You are signed in with an HttpOnly session cookie. Every private page and API call checks
          that session on the server; hiding a button or page never protects data by itself.
        </p>
        <SignOutButton />
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

      <aside className="mf-status-note" role="note" aria-label="How security is handled">
        <p className="mf-status-note__title">
          Security is enforced by the server, never by hiding pages
        </p>
        <p className="mf-status-note__body">
          Every private record is checked against the signed-in user on the server, so a page being
          hidden or a button being disabled never protects anything by itself. Sensitive actions ask
          you to confirm again, and sign-in problems are described in general terms so the page
          cannot be used to discover which email addresses have accounts.
        </p>
      </aside>
    </AppShell>
  );
}
