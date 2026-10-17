'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiClientError } from './api-client';

/**
 * Minimal load-once (plus explicit retry) state machine for the API-backed
 * dashboard/report/category views (IT-8).
 *
 * `load` must be a stable reference — wrap it in `useCallback`. Changing it
 * triggers a refetch, which the reports page uses to reload the series when
 * the granularity changes.
 *
 * A 401 is surfaced as `signedOut` rather than an error so the pages can
 * show the honest sign-in prompt; every other failure maps to `error` (the
 * calm user-facing copy lives in the translation dictionary, not here).
 */

export type AsyncDataState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: T }
  | { readonly status: 'signedOut' }
  | { readonly status: 'error' };

export function useAsyncData<T>(load: () => Promise<T>): {
  readonly state: AsyncDataState<T>;
  readonly retry: () => void;
} {
  const [state, setState] = useState<AsyncDataState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  // Monotonic id: stale responses (granularity switched mid-flight, unmount)
  // are ignored so the view can never render an outdated request's data.
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let cancelled = false;
    setState({ status: 'loading' });

    load()
      .then((data) => {
        if (!cancelled && requestIdRef.current === requestId) {
          setState({ status: 'ready', data });
        }
      })
      .catch((error: unknown) => {
        if (cancelled || requestIdRef.current !== requestId) {
          return;
        }
        if (error instanceof ApiClientError && error.status === 401) {
          setState({ status: 'signedOut' });
          return;
        }
        setState({ status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);

  return { state, retry };
}
