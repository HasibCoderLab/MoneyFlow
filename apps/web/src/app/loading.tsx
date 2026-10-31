'use client';

import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Global loading boundary (Next.js App Router convention). Shown while a
 * route segment loads. Layout stays stable: header-shaped and card-shaped
 * placeholders in the app's own surfaces — no spinners, no layout shift
 * beyond the skeleton itself.
 */
export default function Loading() {
  const { t } = useLocale();
  return (
    <div className="mf-loading" aria-busy="true" aria-label={t('common.loading')}>
      <div className="mf-skeleton mf-skeleton--heading" />
      <div className="mf-skeleton mf-skeleton--line" />
      <div className="mf-skeleton mf-skeleton--line" />
      <div className="mf-skeleton mf-skeleton--card" />
    </div>
  );
}
