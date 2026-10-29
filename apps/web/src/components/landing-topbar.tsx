'use client';

import Link from 'next/link';

import { LanguageSwitcher } from '@/components/language-switcher';
import { LandingNav } from '@/components/landing-nav';
import { ThemeToggle } from '@/components/theme-toggle';
import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Public landing top bar (requirements.md §1.2, §7.4).
 *
 * A client component because the section-label strings and the
 * Bangla/English toggle share the locale context; server rendering keeps
 * the English default and the stored choice applies after mount, matching
 * the app shell (no hydration mismatch).
 */
export function LandingTopbar() {
  const { t } = useLocale();

  return (
    <header className="mf-landing-topbar">
      <div className="mf-landing-container mf-landing-topbar__inner">
        <Link className="mf-landing-brand" href="/">
          <span className="mf-brand-mark" aria-hidden="true">
            M
          </span>
          <span className="mf-landing-brand__text">MoneyFlow</span>
        </Link>
        <nav
          className="mf-landing-nav mf-landing-nav--desktop"
          aria-label={t('landing.ariaSections')}
        >
          <Link className="mf-landing-nav__link" href="#capabilities">
            {t('landing.features')}
          </Link>
          <Link className="mf-landing-nav__link" href="#trust">
            {t('landing.privacy')}
          </Link>
          <Link className="mf-landing-nav__link" href="#roadmap">
            {t('landing.roadmap')}
          </Link>
        </nav>
        <div className="mf-landing-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link className="mf-btn mf-btn--primary" href="/sign-in">
            {t('common.signIn')}
          </Link>
          <LandingNav>
            <Link className="mf-btn mf-btn--primary" href="/sign-in">
              {t('common.signIn')}
            </Link>
          </LandingNav>
        </div>
      </div>
    </header>
  );
}
