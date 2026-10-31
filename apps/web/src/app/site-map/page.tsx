import type { Metadata } from 'next';

import { MarketingPage } from '@/components/marketing-page';
import { SiteMapView } from '@/components/sitemap-view';

export const metadata: Metadata = {
  title: 'Sitemap — MoneyFlow',
  description:
    'Every MoneyFlow route, grouped by area, with its access level and honest availability status.',
};

/**
 * Public 2D sitemap (Phase 1). It is generated from the central route
 * catalogue (`@/lib/routes`), so it cannot drift into advertising pages that
 * do not exist. It contains no private financial data and requires no session.
 */
export default function SiteMapPage() {
  return (
    <MarketingPage eyebrowKey="siteMap.eyebrow" titleKey="siteMap.title" leadKey="siteMap.lead">
      <SiteMapView />
    </MarketingPage>
  );
}
