'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n/locale-context';

/**
 * Global error boundary (Next.js App Router convention). Renders when a
 * route segment throws during render or data loading. Message is safe and
 * actionable: no stack traces, SQL, or sensitive data — those stay in server
 * logs. `reset()` retries the segment; it is safe here because no mutation
 * has run (reads only).
 */
export default function Error({
  error,
  reset,
}: {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}) {
  const { t } = useLocale();

  useEffect(() => {
    console.error('Route error:', error.message, error.digest);
  }, [error]);

  return (
    <div className="mf-error" role="alert">
      <h1>{t('error.title')}</h1>
      <p>
        {t('error.body')}
        {error.digest ? ` (${error.digest})` : null}
      </p>
      <Button onClick={reset}>{t('common.tryAgain')}</Button>
    </div>
  );
}
