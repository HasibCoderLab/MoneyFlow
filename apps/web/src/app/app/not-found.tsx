import type { Metadata } from 'next';

import { AppShell } from '@/components/app-shell';
import { NotFoundView } from '@/components/not-found-view';

export const metadata: Metadata = {
  title: 'Page not found — MoneyFlow',
  description: 'This app page does not exist. Return to the dashboard or browse another section.',
};

/**
 * App-section 404 (Next.js App Router convention). Renders for unknown
 * URLs under /app/*. Keeps the shared app chrome (navigation, sample-data
 * banner) so users stay oriented; the body itself carries no figures.
 */
export default function AppNotFound() {
  return (
    <AppShell>
      <NotFoundView variant="app" />
    </AppShell>
  );
}
