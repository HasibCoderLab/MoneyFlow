import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';

export const metadata: Metadata = {
  title: 'Sign in — MoneyFlow',
  description: 'Sign in to your MoneyFlow account.',
};

/**
 * Sign-in route (requirements.md §4.2, §5.1). Split layout with a trust
 * panel on desktop, local validation, and a live submit connected to the
 * API session endpoints. No recovery or third-party buttons exist yet —
 * they arrive only with their real flows.
 */
export default function SignInPage() {
  return (
    <AuthShell>
      <p className="mf-auth-card__brand">
        <Link className="mf-auth-card__brand-link" href="/" aria-label="MoneyFlow home">
          <span className="mf-brand-mark" aria-hidden="true">
            M
          </span>
          <span>MoneyFlow</span>
        </Link>
      </p>
      <header className="mf-auth-card__intro">
        <h1 className="mf-auth-card__title">Sign in</h1>
        <p className="mf-auth-card__subtitle">Welcome back.</p>
      </header>
      <AuthForm variant="sign-in" />
      <p className="mf-auth-card__footer">
        New to MoneyFlow? <Link href="/sign-up">Create an account</Link>
      </p>
    </AuthShell>
  );
}
