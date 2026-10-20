import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { LocaleProvider } from '@/lib/i18n/locale-context';

import './globals.css';

export const metadata: Metadata = {
  title: 'MoneyFlow — Take Control of Your Money',
  description:
    'MoneyFlow helps you track spending, build savings habits, and reach your financial goals. Simple, private, and built for students and beginner savers.',
  openGraph: {
    title: 'MoneyFlow — Take Control of Your Money',
    description:
      'Track spending, build savings habits, and move toward your financial goals in one simple place.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // suppressHydrationWarning: the pre-paint script below may add data-theme
    // before React hydrates; the attribute is cosmetic and safe to ignore.
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Applies the stored Light/Dark/System choice before first paint (no
            flash). Light is the default when nothing valid is stored; System
            resolves through the OS preference (IT-11). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("mf-theme");if(t!=="light"&&t!=="dark"&&t!=="system")t="light";var r=t==="system"?(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):t;document.documentElement.setAttribute("data-theme",r);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`,
          }}
        />
        {/* Bangla/English label preference for every route (requirements.md
            §5.2, §7.4). The provider is client-side; see locale-context.tsx. */}
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
