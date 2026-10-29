import Link from 'next/link';
import type { ReactNode } from 'react';

import { LandingTopbar } from '@/components/landing-topbar';
import { SiteFooter } from '@/components/site-footer';
import { getRouteById } from '@/lib/routes';

/**
 * Shared chrome for the public product pages (/features, /about, /contact,
 * /site-map). Keeps one topbar/footer and one skip-link, so public pages do
 * not invent their own navigation (requirements.md §5).
 */
export function MarketingPage({
  eyebrow,
  title,
  lead,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly lead: string;
  readonly children: ReactNode;
}) {
  const home = getRouteById('home');

  return (
    <div className="mf-landing">
      <a className="mf-skip-link" href="#main-content">
        Skip to main content
      </a>
      <LandingTopbar />
      <main id="main-content">
        <section className="mf-doc-hero" aria-labelledby="page-title">
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">{eyebrow}</p>
            <h1 className="mf-doc-hero__title" id="page-title">
              {title}
            </h1>
            <p className="mf-doc-hero__lead">{lead}</p>
            <nav className="mf-doc-hero__crumbs" aria-label="Breadcrumb">
              <Link href={home?.href ?? '/'}>Home</Link>
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
  title,
  children,
}: {
  readonly id?: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="mf-doc__section" id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 className="mf-doc__heading" id={id ? `${id}-title` : undefined}>
        {title}
      </h2>
      {children}
    </section>
  );
}
