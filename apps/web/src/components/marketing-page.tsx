'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { LandingTopbar } from '@/components/landing-topbar';
import { SiteFooter } from '@/components/site-footer';
import { useLocale } from '@/lib/i18n/locale-context';
import type { TranslationKey } from '@/lib/i18n/translations';
import { getRouteById } from '@/lib/routes';

/**
 * Shared chrome for the public product pages (/features, /about, /contact,
 * /site-map). Keeps one topbar/footer and one skip-link, so public pages do
 * not invent their own navigation (requirements.md §5).
 */
export function MarketingPage({
  eyebrowKey,
  titleKey,
  leadKey,
  children,
}: {
  readonly eyebrowKey: TranslationKey;
  readonly titleKey: TranslationKey;
  readonly leadKey: TranslationKey;
  readonly children: ReactNode;
}) {
  const { t } = useLocale();
  const home = getRouteById('home');
  const title = t(titleKey);

  return (
    <div className="mf-landing">
      <a className="mf-skip-link" href="#main-content">
        {t('app.skipToContent')}
      </a>
      <LandingTopbar />
      <main id="main-content">
        <section className="mf-doc-hero" aria-labelledby="page-title">
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">{t(eyebrowKey)}</p>
            <h1 className="mf-doc-hero__title" id="page-title">
              {title}
            </h1>
            <p className="mf-doc-hero__lead">{t(leadKey)}</p>
            <nav className="mf-doc-hero__crumbs" aria-label={t('marketing.breadcrumb')}>
              <Link href={home?.href ?? '/'}>{t('marketing.home')}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{title}</span>
            </nav>
          </div>
        </section>
        <div className="mf-landing-container mf-doc">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Consistent section inside a public document page. */
export function DocSection({
  id,
  titleKey,
  children,
}: {
  readonly id?: string;
  readonly titleKey: TranslationKey;
  readonly children: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <section className="mf-doc__section" id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 className="mf-doc__heading" id={id ? `${id}-title` : undefined}>
        {t(titleKey)}
      </h2>
      {children}
    </section>
  );
}
