import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthForm } from '@/components/auth-form';
import { AuthShell } from '@/components/auth-shell';

export const metadata: Metadata = {
  title: 'Create account — MoneyFlow',
  description: 'Create your MoneyFlow account.',
};

/**
 * Sign-up route (requirements.md §4.2, §5.1). Split layout with a trust
 * panel on desktop, local validation, and a live submit connected to the
 * API registration endpoint. No recovery or third-party buttons exist yet —
 * they arrive only with their real flows.
 */
export default function SignUpPage() {
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
        <h1 className="mf-auth-card__title">Create your account</h1>
        <p className="mf-auth-card__subtitle">Start tracking your money.</p>
      </header>
      <AuthForm variant="sign-up" />
      <p className="mf-auth-card__footer">
        Already have an account? <Link href="/sign-in">Sign in</Link>
      </p>
    </AuthShell>
  );
}
