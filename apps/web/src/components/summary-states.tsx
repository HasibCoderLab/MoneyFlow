'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Shared loading / signed-out / error panels for the API-backed pages (IT-8).
 * Copy resolves through the locale dictionary; no figure is ever invented
 * here (§5.10: honest empty and failure states).
 */

/** Neutral skeleton — never fake figures, mirrors the global loading shape. */
export function SummaryLoading() {
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

/** 401: the page shows private recorded data, so it asks for sign-in. */
export function SummarySignedOut() {
  const { t } = useLocale();
  return (
    <div className="mf-empty">
      <p className="mf-empty__title">{t('summary.signedOutTitle')}</p>
      <p className="mf-empty__text">{t('summary.signedOutBody')}</p>
      <Link className="mf-btn mf-btn--primary" href="/sign-in">
        {t('common.signIn')}
      </Link>
    </div>
  );
}

/** Any other failure: calm copy plus an explicit retry action. */
export function SummaryError({ onRetry }: { readonly onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <div className="mf-empty" role="alert">
      <p className="mf-empty__title">{t('summary.errorTitle')}</p>
      <p className="mf-empty__text">{t('summary.errorBody')}</p>
      <Button variant="ghost" onClick={onRetry}>
        {t('common.tryAgain')}
      </Button>
    </div>
  );
}
