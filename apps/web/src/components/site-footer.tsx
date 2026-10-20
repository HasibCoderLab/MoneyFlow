'use client';

import Link from 'next/link';

import { useLocale } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';

/**
 * Public site footer (requirements.md §1.2, §4.1, §7.4).
 *
 * Ground rules this follows:
 * - Only links to routes that exist: in-page anchors on `/` and the live
 *   authenticated `/app/*` pages. Privacy/Terms/Contact pages do not exist yet,
 *   so they appear as honest forthcoming text — never as dead links.
 * - No testimonials, user counts, certifications, pricing, or guarantees.
 * - States the working-title status, the PaathAI relationship, and the
 *   not-financial-advice disclaimer in plain language.
 * - Covered strings resolve through the locale context; the footer is a
 *   client component so the stored Bangla choice applies after mount.
 */
type FooterLink = {
  readonly labelKey: TranslationKey;
  readonly href: string;
};

const PRODUCT_LINKS: readonly FooterLink[] = [
  { labelKey: 'footer.capabilities', href: '/#capabilities' },
  { labelKey: 'footer.privacyAndTrust', href: '/#trust' },
  { labelKey: 'landing.roadmap', href: '/#roadmap' },
] as const;

const PREVIEW_LINKS: readonly FooterLink[] = [
  { labelKey: 'nav.dashboard', href: '/app/dashboard' },
  { labelKey: 'nav.accounts', href: '/app/accounts' },
  { labelKey: 'nav.transactions', href: '/app/transactions' },
  { labelKey: 'nav.budgets', href: '/app/budgets' },
  { labelKey: 'nav.goals', href: '/app/goals' },
  { labelKey: 'nav.reports', href: '/app/reports' },
] as const;

export function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="mf-site-footer">
      <div className="mf-landing-container mf-site-footer__inner">
        <div className="mf-site-footer__brand">
          <p className="mf-landing-footer__brand">
            MoneyFlow <span className="mf-landing-brand__working">{t('app.workingTitle')}</span>
          </p>
          <p className="mf-site-footer__promise">{t('footer.promise')}</p>
          <p className="mf-landing-footer__note">{t('footer.about')}</p>
        </div>

        <nav className="mf-site-footer__nav" aria-label={t('footer.productHeading')}>
          <p className="mf-site-footer__heading">{t('footer.productHeading')}</p>
          <ul>
            {PRODUCT_LINKS.map((link) => (
              <li key={link.href}>
                <Link className="mf-site-footer__link" href={link.href}>
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="mf-site-footer__nav" aria-label={t('footer.previewHeading')}>
          <p className="mf-site-footer__heading">{t('footer.previewHeading')}</p>
          <ul>
            {PREVIEW_LINKS.map((link) => (
              <li key={link.href}>
                <Link className="mf-site-footer__link" href={link.href}>
                  {t(link.labelKey)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mf-site-footer__legal">
          <p className="mf-site-footer__heading">{t('footer.legalHeading')}</p>
          <p className="mf-landing-footer__note">{t('footer.legalNote')}</p>
        </div>
      </div>

      <div className="mf-landing-container mf-site-footer__base">
        <p>{t('footer.copyright', { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
