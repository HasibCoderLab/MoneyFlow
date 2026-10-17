import type { Metadata } from 'next';
import type { ReactNode } from 'react';

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
        {/* Applies the stored light/dark choice before first paint (no flash).
            Light is the default when nothing valid is stored. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("mf-theme");if(t!=="light"&&t!=="dark")t="light";document.documentElement.setAttribute("data-theme",t);}catch(e){document.documentElement.setAttribute("data-theme","light");}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
