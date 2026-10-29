import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { checkServerSession } from '@/lib/server-session';
import { signInPathFor } from '@/lib/route-access';

/**
 * Protected app layout (requirements.md §5, §10.2).
 *
 * The middleware has already redirected browsers with no session cookie.
 * This layout additionally verifies the cookie with the API before private
 * pages render, and returns the user to the page they asked for after sign-in.
 * It is a UX guard only; every API request remains authorized independently.
 */
export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get('x-mf-pathname');

  if (pathname) {
    const session = await checkServerSession(requestHeaders.get('cookie') ?? '');
    if (session === 'invalid') {
      redirect(signInPathFor(pathname));
    }
  }

  return children;
}
