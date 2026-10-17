'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

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
  useEffect(() => {
    console.error('Route error:', error.message, error.digest);
  }, [error]);

  return (
    <div className="mf-error" role="alert">
      <h1>Something went wrong</h1>
      <p>
        This section could not be displayed. Your records are unaffected — nothing was changed.
        {error.digest ? ` (Reference: ${error.digest})` : null}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
