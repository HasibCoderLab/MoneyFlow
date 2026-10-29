import type { Metadata } from 'next';
import Link from 'next/link';

import { DocSection, MarketingPage } from '@/components/marketing-page';

export const metadata: Metadata = {
  title: 'About — MoneyFlow',
  description:
    'MoneyFlow is a personal finance companion for students, beginner savers, and young earners — a standalone product under the PaathAI umbrella.',
};

export default function AboutPage() {
  return (
    <MarketingPage
      eyebrow="About"
      title="A calmer way to understand your money"
      lead="MoneyFlow is a personal finance companion for students, beginner savers, and young earners. It is an early foundation build, and this page describes only what exists."
    >
      <DocSection id="purpose" title="Why it exists">
        <p>
          MoneyFlow is built around one promise: know your money, build better habits, reach your
          goals. Instead of bank connections or automatic imports, you record what happened, and the
          app turns those records into clear balances, spending summaries, budget progress, and
          savings goal progress.
        </p>
        <p>
          The first audience is people in Bangladesh who want a simple starting point. BDT is the
          first supported currency, and the interface supports English and Bangla labels. Other
          currencies are designed for, but multi-currency conversion is not implemented.
        </p>
      </DocSection>

      <DocSection id="principles" title="How it is built">
        <ul className="mf-report-list">
          <li>Financial totals come from deterministic, tested code — never from an AI model.</li>
          <li>Every private record is scoped to its signed-in owner on the server.</li>
          <li>The interface never invents balances, trends, testimonials, or certifications.</li>
          <li>Spending guidance is neutral: no shame, streaks, or dark patterns.</li>
          <li>Not-built features are labelled as not built, in the app and on this site.</li>
        </ul>
      </DocSection>

      <DocSection id="relationship" title="Relationship to PaathAI">
        <p>
          MoneyFlow is a standalone product under the PaathAI umbrella. It is separate from the
          PaathAI education platform: it contains no courses, board questions, or student learning
          rooms. &ldquo;MoneyFlow&rdquo; is currently a working name; the final product name is not
          decided.
        </p>
      </DocSection>

      <DocSection id="status" title="Current status">
        <p>
          Accounts, transactions, categories, budgets, savings goals, reports, dashboard
          customization, preferences, CSV export, and account deletion are implemented. Onboarding,
          password recovery, and email verification are not built yet. There is no pricing and no
          paid plan.
        </p>
        <p className="mf-doc__note">
          The full route-by-route status is in the <Link href="/site-map">sitemap</Link>. Questions
          can go through the <Link href="/contact">contact page</Link>.
        </p>
      </DocSection>
    </MarketingPage>
  );
}
