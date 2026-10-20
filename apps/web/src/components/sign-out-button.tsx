'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { AuthError, signOut } from '@/lib/auth-client';

/**
 * Ends the current session through the API (`POST /api/v1/auth/sign-out`,
 * HttpOnly cookie cleared server-side) and returns to the sign-in page.
 * A real session-ending action, not a placeholder.
 */
export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await signOut();
      router.push('/sign-in');
    } catch (cause) {
      setError(cause instanceof AuthError ? cause.message : 'Could not sign out. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="mf-form__actions">
      <Button onClick={() => void run()} disabled={busy}>
        {busy ? 'Signing out…' : 'Sign out'}
      </Button>
      {error ? (
        <p className="mf-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="mf-field__hint">
        This ends the session on this device. Other devices keep their own sessions.
      </p>
    </div>
  );
}
