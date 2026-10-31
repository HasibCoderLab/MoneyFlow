'use client';

import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';

import { CheckIcon, ShieldIcon, WalletIcon, type IconProps } from '@/components/icons';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { I18nText } from '@/components/i18n-text';
import { useLocale } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';

type Principle = {
  readonly titleKey: TranslationKey;
  readonly textKey: TranslationKey;
  readonly icon: ComponentType<IconProps>;
};

/** Shortened from the landing trust section (requirements.md §1.4, §10). */
const PRINCIPLES: readonly Principle[] = [
  {
    titleKey: 'auth.principle.records.title',
    textKey: 'auth.principle.records.text',
    icon: ShieldIcon,
  },
  {
    titleKey: 'auth.principle.numbers.title',
    textKey: 'auth.principle.numbers.text',
    icon: CheckIcon,
  },
  {
    titleKey: 'auth.principle.bank.title',
    textKey: 'auth.principle.bank.text',
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
  const { t } = useLocale();
  return (
    <div className="mf-auth-page">
      <a className="mf-skip-link" href="#main-content">
        <I18nText k="app.skipToContent" />
      </a>
      <div className="mf-auth-shell">
        <aside className="mf-auth-aside" aria-label={t('auth.about')}>
          <div className="mf-auth-aside__glow" aria-hidden="true">
            <span className="mf-auth-aside__orb mf-auth-aside__orb--one" />
            <span className="mf-auth-aside__orb mf-auth-aside__orb--two" />
          </div>
          <Link className="mf-auth-aside__brand" href="/" aria-label={t('auth.home')}>
            <span className="mf-auth-aside__mark" aria-hidden="true">
              M
            </span>
            <span>MoneyFlow</span>
          </Link>
          <div className="mf-auth-aside__body">
            <p className="mf-auth-aside__tagline">
              <I18nText k="footer.promise" />
            </p>
            <ul className="mf-auth-aside__points">
              {PRINCIPLES.map((principle) => {
                const PrincipleIcon = principle.icon;
                return (
                  <li key={principle.titleKey}>
                    <span className="mf-auth-aside__point-icon" aria-hidden="true">
                      <PrincipleIcon />
                    </span>
                    <span>
                      <strong>{t(principle.titleKey)}.</strong> {t(principle.textKey)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <p className="mf-auth-aside__footer">
            {t('auth.asideFooter')} <Link href="/app/dashboard">{t('auth.openDashboard')}</Link>
          </p>
        </aside>
        <main id="main-content" className="mf-auth-main">
          <div className="mf-auth-theme">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
          <div className="mf-auth-card">{children}</div>
        </main>
      </div>
    </div>
  );
}
