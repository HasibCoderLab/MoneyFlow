'use client';

import { usePathname } from 'next/navigation';

import { InfoIcon } from '@/components/icons';
import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Sample-data notice (IT-8/IT-9/IT-10). It renders only on pages that still
 * show mock figures — never on the API-backed dashboard, reports, categories,
 * budgets, goals, or the settings pages — so the banner can neither label
 * real data as sample nor stay silent where sample data is shown (AGENTS.md
 * rule 12).
 */
const SAMPLE_DATA_ROUTES = ['/app/accounts', '/app/transactions'] as const;

export function MockDataBanner() {
  const pathname = usePathname();
  const { t } = useLocale();

  const showsSampleData = SAMPLE_DATA_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
  if (!showsSampleData) {
    return null;
  }

  return (
    <aside className="mf-mock-banner" role="note" aria-label={t('banner.ariaLabel')}>
      <InfoIcon />
      <span>
        <strong>{t('banner.title')}</strong> {t('banner.body')}
      </span>
    </aside>
  );
}
