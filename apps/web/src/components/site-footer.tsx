'use client';

import Link from 'next/link';

import { useLocale } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';
import { getRouteById } from '@/lib/routes';

/**
 * Public site footer (requirements.md §1.2, §4.1, §7.4).
 *
 * Ground rules this follows:
 * - Every destination comes from the central route catalogue and is an
 *   implemented page. Privacy/Terms/Contact pages do not exist yet, so they
 *   appear as honest forthcoming text — never as dead links.
 * - No testimonials, user counts, certifications, pricing, or guarantees.
 * - States the PaathAI relationship and the not-financial-advice
 *   disclaimer in plain language.
 * - Covered strings resolve through the locale context; the footer is a
 *   client component so the stored Bangla choice applies after mount.
 */
type FooterLink = {
  readonly labelKey: TranslationKey;
  readonly href: string;
};

function catalogueHref(id: string): string {
  const route = getRouteById(id);
  if (!route) {
    throw new Error(`Unknown route id in footer: ${id}`);
  }
  return route.href;
}

const PRODUCT_LINKS: readonly FooterLink[] = [
  { labelKey: 'footer.featuresLink', href: catalogueHref('features') },
  { labelKey: 'footer.aboutLink', href: catalogueHref('about') },
  { labelKey: 'footer.contactLink', href: catalogueHref('contact') },
  { labelKey: 'footer.sitemapLink', href: catalogueHref('site-map') },
] as const;

const PREVIEW_LINKS: readonly FooterLink[] = [
  { labelKey: 'nav.dashboard', href: catalogueHref('dashboard') },
  { labelKey: 'nav.accounts', href: catalogueHref('accounts') },
  { labelKey: 'nav.transactions', href: catalogueHref('transactions') },
  { labelKey: 'nav.budgets', href: catalogueHref('budgets') },
  { labelKey: 'nav.goals', href: catalogueHref('goals') },
  { labelKey: 'nav.reports', href: catalogueHref('reports') },
] as const;

export function SiteFooter() {
  const { t } = useLocale();

  return (
    <footer className="mf-site-footer">
      <div className="mf-landing-container mf-site-footer__inner">
        <div className="mf-site-footer__brand">
          <Link className="mf-landing-footer__brand" href="/">
            MoneyFlow
          </Link>
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
