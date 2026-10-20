import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';

import { CheckIcon, ShieldIcon, WalletIcon, type IconProps } from '@/components/icons';
import { LanguageToggle } from '@/components/language-toggle';
import { ThemeToggle } from '@/components/theme-toggle';
import { I18nText } from '@/components/i18n-text';

type Principle = {
  readonly title: string;
  readonly text: string;
  readonly icon: ComponentType<IconProps>;
};

/** Shortened from the landing trust section (requirements.md §1.4, §10). */
const PRINCIPLES: readonly Principle[] = [
  {
    title: 'Your records stay yours',
    text: 'Private financial data is scoped to your authenticated account on the server.',
    icon: ShieldIcon,
  },
  {
    title: 'Numbers you can check',
    text: 'Balances and totals come from deterministic, tested code — never from a language model.',
    icon: CheckIcon,
  },
  {
    title: 'No bank credentials',
    text: 'MoneyFlow never asks for your bank or mobile-wallet logins.',
    icon: WalletIcon,
  },
];

/**
 * Shared frame for the sign-in and sign-up preview pages.
 *
 * Desktop shows a trust panel describing accepted product principles;
 * below 62rem the panel is hidden and the card carries the brand. The
 * theme toggle is a real, working control; the forms submit to the live
 * API session endpoints with HttpOnly cookies.
 */
export function AuthShell({ children }: { readonly children: ReactNode }) {
  return (
    <div className="mf-auth-page">
      <a className="mf-skip-link" href="#main-content">
        <I18nText k="app.skipToContent" />
      </a>
      <div className="mf-auth-shell">
        <aside className="mf-auth-aside" aria-label="About MoneyFlow">
          <div className="mf-auth-aside__glow" aria-hidden="true">
            <span className="mf-auth-aside__orb mf-auth-aside__orb--one" />
            <span className="mf-auth-aside__orb mf-auth-aside__orb--two" />
          </div>
          <p className="mf-auth-aside__brand">
            <span className="mf-auth-aside__mark" aria-hidden="true">
              M
            </span>
            <span>
              MoneyFlow{' '}
              <span className="mf-auth-aside__working">
                <I18nText k="app.workingTitle" />
              </span>
            </span>
          </p>
          <div className="mf-auth-aside__body">
            <p className="mf-auth-aside__tagline">
              <I18nText k="footer.promise" />
            </p>
            <ul className="mf-auth-aside__points">
              {PRINCIPLES.map((principle) => {
                const PrincipleIcon = principle.icon;
                return (
                  <li key={principle.title}>
                    <span className="mf-auth-aside__point-icon" aria-hidden="true">
                      <PrincipleIcon />
                    </span>
                    <span>
                      <strong>{principle.title}.</strong> {principle.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mf-auth-aside__footer">
            Foundation build — the app shows recorded figures from your own account.{' '}
            <Link href="/app/dashboard">Open the dashboard</Link>
          </p>
        </aside>
        <main id="main-content" className="mf-auth-main">
          <div className="mf-auth-theme">
            <LanguageToggle />
            <ThemeToggle />
          </div>
          <div className="mf-auth-card">{children}</div>
        </main>
      </div>
    </div>
  );
}
