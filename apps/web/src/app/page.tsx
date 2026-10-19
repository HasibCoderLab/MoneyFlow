import type { Metadata } from 'next';
import Link from 'next/link';

import { LandingTopbar } from '@/components/landing-topbar';
import { ProductPreview } from '@/components/product-preview';
import { SiteFooter } from '@/components/site-footer';
import { MOCK_SAVINGS_GOALS } from '@/lib/mock-data';
import {
  BudgetsIcon,
  DashboardIcon,
  GoalsIcon,
  ReportsIcon,
  SettingsIcon,
  ShieldIcon,
  SparkleIcon,
  TagIcon,
  WalletIcon,
} from '@/components/icons';

export const metadata: Metadata = {
  title: 'MoneyFlow — Take Control of Your Money',
  description:
    'MoneyFlow helps you track spending, build savings habits, and reach your financial goals. Simple, private, and built for students and beginner savers.',
};

const BENEFITS = [
  {
    title: 'Understand your spending',
    description:
      'Record income and expenses and see where your money goes, organised by the categories you choose.',
    tag: 'MVP',
    icon: 'blue',
    Icon: WalletIcon,
  },
  {
    title: 'Build better saving habits',
    description:
      'Give savings a purpose — an emergency fund, a laptop, a course — and watch progress grow with every contribution.',
    tag: 'MVP',
    icon: 'purple',
    Icon: GoalsIcon,
  },
  {
    title: 'Plan with confidence',
    description:
      'Organise monthly budgets by category and compare recorded spending with the limits you set.',
    tag: 'MVP',
    icon: 'cyan',
    Icon: BudgetsIcon,
  },
  {
    title: 'See your financial picture',
    description:
      'Review useful summaries of the financial activity you choose to track, in one calm place.',
    tag: 'MVP',
    icon: 'warm',
    Icon: DashboardIcon,
  },
  {
    title: 'Set and track savings goals',
    description:
      'Create goals with targets and deadlines, contribute when you can, and see your progress over time.',
    tag: 'MVP',
    icon: 'blue',
    Icon: GoalsIcon,
  },
  {
    title: 'Customise your dashboard',
    description:
      'Show, hide, and reorder dashboard widgets so the information you care about is always within reach.',
    tag: 'MVP',
    icon: 'purple',
    Icon: ReportsIcon,
  },
  {
    title: 'An assistant that explains your money',
    description:
      'Ask about your own recorded data. It explains using the same tested calculations as the rest of the product — it never invents a balance.',
    tag: 'V1',
    icon: 'cyan',
    Icon: SparkleIcon,
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Set up your accounts',
    description: 'Add the cash, bank, and mobile-wallet balances you already track.',
  },
  {
    step: '02',
    title: 'Record your income and expenses',
    description:
      'Log money in and out as it happens. Transfers between your own accounts are never counted twice.',
  },
  {
    step: '03',
    title: 'Review and adjust',
    description:
      'Check your progress against goals and budgets, then refine what you plan to do next.',
  },
];

const TRUST_POINTS = [
  {
    title: 'Your records stay yours',
    description:
      'Financial data is scoped to your authenticated account on the server. MoneyFlow never trusts a user ID supplied by the browser.',
  },
  {
    title: 'Numbers you can check',
    description:
      'Balances, totals, and percentages come from deterministic, tested code — not from a language model.',
  },
  {
    title: 'No bank credentials',
    description:
      'MoneyFlow does not ask for your bank or mobile-wallet logins, and will not connect to them without a separate security and legal review.',
  },
  {
    title: 'Plain, no-pressure language',
    description:
      'No shame, fake urgency, or dark patterns. MoneyFlow claims no compliance standard it has not earned.',
  },
];

const ROADMAP = [
  {
    level: 'MVP',
    state: 'In progress',
    scope:
      'Core financial workflows — accounts, transactions, categories, budgets, goals, and a customisable dashboard.',
  },
  {
    level: 'V1',
    state: 'Planned',
    scope: 'AI Money Assistant, smart insights, recurring transactions, and notifications.',
  },
  {
    level: 'Later',
    state: 'Research only',
    scope:
      'Bank integrations, shared household finances, multi-currency support, and native mobile apps.',
  },
];

/** Personal-control highlights (requirements.md §5.7; single layout in MVP per DR-12). */
const CONTROL_POINTS = [
  {
    title: 'Categories that fit your life',
    description:
      'Create, rename, recolor, and archive your own income and expense categories. History stays readable.',
    Icon: TagIcon,
  },
  {
    title: 'A dashboard you arrange',
    description:
      'Show, hide, and reorder widgets and choose your theme, then keep a layout that is genuinely yours.',
    Icon: DashboardIcon,
  },
  {
    title: 'Preferences you control',
    description: 'Light or dark theme, plus date and number formats that suit how you read money.',
    Icon: SettingsIcon,
  },
  {
    title: 'Goals and budgets you define',
    description: 'Set your own targets, limits, and deadlines. Nothing is decided for you.',
    Icon: GoalsIcon,
  },
];

/**
 * Grounded answers only (requirements.md §§1–5, §10; DR-08/13/16/17).
 * Pricing is undecided (DR-17), so no pricing question is included.
 */
const FAQ = [
  {
    q: 'What is MoneyFlow?',
    a: 'MoneyFlow (working title) is a standalone personal finance companion under the PaathAI umbrella — separate from the PaathAI education platform. It helps you record and understand income, expenses, budgets, and savings goals in one calm place.',
  },
  {
    q: 'Who is MoneyFlow designed for?',
    a: 'Students, beginner savers, and young earners who want a simple, trustworthy way to understand their money. No finance expertise is needed to start.',
  },
  {
    q: 'How do I track income and expenses?',
    a: 'You record them manually as they happen. Transfers between your own accounts move money without ever being counted as income or spending, so your totals stay honest.',
  },
  {
    q: 'Can I create my own categories?',
    a: 'Yes. You can create, rename, recolor, archive, and organize your own income and expense categories, and reports remain understandable when categories change.',
  },
  {
    q: 'Can I set savings goals?',
    a: 'Yes — including an emergency-fund template. You add contributions, see saved and remaining amounts with honest progress, and adjust targets without losing history.',
  },
  {
    q: 'Does MoneyFlow connect to my bank?',
    a: 'No. MoneyFlow keeps manual records only and never asks for your bank or mobile-wallet logins. Bank connections are research-only and would require a separate security and legal review first.',
  },
  {
    q: 'How is my financial information handled?',
    a: 'Records belong to your authenticated account and are scoped to it on the server. Balances and totals come from deterministic, tested code. CSV export and account deletion are part of the plan, and the privacy text will be published to match the implementation before launch.',
  },
];

export default function Home() {
  // Illustrative literal for the marketing composition below — never a
  // calculation and never presented as a real account (AGENTS.md rule 12).
  const goal = MOCK_SAVINGS_GOALS[0];

  return (
    <div className="mf-landing">
      <a className="mf-skip-link" href="#main-content">
        Skip to main content
      </a>

      <LandingTopbar />

      <main id="main-content">
        {/* Hero */}
        <section className="mf-hero" aria-labelledby="hero-title">
          <div className="mf-hero__glow" aria-hidden="true">
            <div className="mf-hero__orb mf-hero__orb--one" />
            <div className="mf-hero__orb mf-hero__orb--two" />
            <div className="mf-hero__orb mf-hero__orb--three" />
          </div>
          <div className="mf-hero__copy">
            <p className="mf-hero__eyebrow">Personal finance, made clear</p>
            <h1 className="mf-hero__title" id="hero-title">
              Know your money.{' '}
              <span className="mf-hero__accent">Build better habits. Reach your goals.</span>
            </h1>
            <p className="mf-hero__lead">
              Track your spending, build savings habits, and move toward your financial goals — all
              in one simple place.
            </p>
            <div className="mf-hero__actions">
              <Link className="mf-btn mf-btn--primary" href="/sign-up">
                Get started
              </Link>
              <Link className="mf-btn mf-btn--ghost" href="#capabilities">
                Explore features
              </Link>
            </div>
            <p className="mf-hero__trust">Your money. Your goals. Your decisions.</p>
          </div>
          <div className="mf-hero__preview">
            <ProductPreview />
          </div>
        </section>

        {/* Status note */}
        <div className="mf-landing-container">
          <div className="mf-status-note">
            <p className="mf-status-note__title">This is a foundation build</p>
            <p className="mf-status-note__body">
              The interfaces you see are working previews. Some features are not built yet, and
              nothing here is real financial data.
            </p>
          </div>
        </div>

        {/* Capabilities */}
        <section id="capabilities" className="mf-section" aria-labelledby="capabilities-title">
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">Capabilities</p>
            <h2 className="mf-section__title" id="capabilities-title">
              What MoneyFlow is being built to do
            </h2>
            <p className="mf-section__subtitle">
              A clear, honest set of tools to help you understand and manage your money.
            </p>
            <ul className="mf-feature-grid">
              {BENEFITS.map((feature) => (
                <li key={feature.title} className="mf-feature">
                  <div
                    className={`mf-feature__icon mf-feature__icon--${feature.icon}`}
                    aria-hidden="true"
                  >
                    <feature.Icon />
                  </div>
                  <div className="mf-feature__head">
                    <h3 className="mf-feature__title">{feature.title}</h3>
                    <span
                      className={`mf-feature__tag mf-feature__tag--${feature.tag.toLowerCase()}`}
                    >
                      {feature.tag}
                    </span>
                  </div>
                  <p className="mf-feature__text">{feature.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="mf-section mf-section--muted"
          aria-labelledby="how-it-works-title"
        >
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">How it works</p>
            <h2 className="mf-section__title" id="how-it-works-title">
              Three simple steps
            </h2>
            <p className="mf-section__subtitle">
              No bank connections, no automatic imports — just a clear way to record and review your
              money.
            </p>
            <ol className="mf-steps">
              {STEPS.map((step) => (
                <li key={step.step} className="mf-step">
                  <span className="mf-step__number" aria-hidden="true">
                    {step.step}
                  </span>
                  <div>
                    <h3 className="mf-step__title">{step.title}</h3>
                    <p className="mf-step__text">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Savings goals (illustrative) */}
        <section id="savings-goals" className="mf-section" aria-labelledby="savings-goals-title">
          <div className="mf-landing-container">
            <div className="mf-goal-visual">
              <div>
                <p className="mf-section__eyebrow">Savings goals</p>
                <h2 className="mf-section__title" id="savings-goals-title">
                  Small steps. Meaningful progress.
                </h2>
                <p className="mf-section__subtitle">
                  Give your savings a purpose, track what you contribute, and see how far you have
                  come.
                </p>
                <ul className="mf-goal-visual__examples" aria-label="Example goals">
                  <li>Emergency fund</li>
                  <li>New laptop</li>
                  <li>Education</li>
                  <li>Personal savings</li>
                </ul>
              </div>
              {goal ? (
                <div
                  className="mf-goal-visual__panel"
                  aria-label={`Illustrative goal progress: ${goal.name}, ${goal.percent} percent saved. Demo data, not a real account.`}
                >
                  <div className="mf-goal-visual__ring" aria-hidden="true">
                    <svg viewBox="0 0 120 120" width="160" height="160">
                      <circle
                        className="mf-goal-visual__track"
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                      />
                      <circle
                        className="mf-goal-visual__fill"
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeLinecap="round"
                        transform="rotate(-90 60 60)"
                      />
                    </svg>
                    <div className="mf-goal-visual__center">
                      <span className="mf-goal-visual__pct">{goal.percent}%</span>
                      <span className="mf-goal-visual__cap">of goal</span>
                    </div>
                  </div>
                  <div>
                    <p className="mf-goal-visual__name">{goal.name}</p>
                    <p className="mf-goal-visual__amount">
                      {goal.saved} of {goal.target}
                    </p>
                    <p className="mf-goal-visual__note">
                      Illustrative demo data — not a real account.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {/* Personal control */}
        <section
          id="control"
          className="mf-section mf-section--muted"
          aria-labelledby="control-title"
        >
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">Personal control</p>
            <h2 className="mf-section__title" id="control-title">
              Your finances. Your rules.
            </h2>
            <p className="mf-section__subtitle">
              Create a tracking system that reflects your own priorities, categories, budgets, and
              savings goals.
            </p>
            <ul className="mf-feature-grid">
              {CONTROL_POINTS.map((point) => (
                <li key={point.title} className="mf-feature">
                  <div className="mf-feature__icon mf-feature__icon--blue" aria-hidden="true">
                    <point.Icon />
                  </div>
                  <h3 className="mf-feature__title">{point.title}</h3>
                  <p className="mf-feature__text">{point.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="mf-section" aria-labelledby="trust-title">
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">Privacy and trust</p>
            <h2 className="mf-section__title" id="trust-title">
              Built to be trustworthy
            </h2>
            <p className="mf-section__subtitle">
              Your financial information deserves care. Here is how MoneyFlow is designed to protect
              it.
            </p>
            <ul className="mf-trust-grid">
              {TRUST_POINTS.map((point) => (
                <li key={point.title} className="mf-trust">
                  <div className="mf-trust__icon" aria-hidden="true">
                    <ShieldIcon />
                  </div>
                  <h3 className="mf-trust__title">{point.title}</h3>
                  <p className="mf-trust__text">{point.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Roadmap */}
        <section
          id="roadmap"
          className="mf-section mf-section--muted"
          aria-labelledby="roadmap-title"
        >
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">Roadmap</p>
            <h2 className="mf-section__title" id="roadmap-title">
              Where this is today
            </h2>
            <p className="mf-section__subtitle">
              MoneyFlow is being built in stages. Here is what is happening now and what is coming
              next.
            </p>
            <ul className="mf-roadmap">
              {ROADMAP.map((item) => (
                <li key={item.level} className="mf-roadmap__row">
                  <span className="mf-roadmap__level">{item.level}</span>
                  <span className="mf-roadmap__state">{item.state}</span>
                  <span className="mf-roadmap__scope">{item.scope}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ (grounded answers only; pricing omitted — DR-17) */}
        <section id="faq" className="mf-section" aria-labelledby="faq-title">
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">Questions</p>
            <h2 className="mf-section__title" id="faq-title">
              Frequently asked questions
            </h2>
            <p className="mf-section__subtitle">
              Only what is known today. Pricing is not decided yet, so it is not covered here.
            </p>
            <div className="mf-faq">
              {FAQ.map((item) => (
                <details key={item.q} className="mf-faq__item" name="moneyflow-faq">
                  <summary className="mf-faq__question">{item.q}</summary>
                  <p className="mf-faq__answer">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mf-section" aria-labelledby="cta-title">
          <div className="mf-landing-container">
            <div className="mf-cta">
              <div>
                <h2 className="mf-cta__title" id="cta-title">
                  Start with the UI preview
                </h2>
                <p className="mf-cta__text">
                  Explore the interface with sample data — no account needed.
                </p>
              </div>
              <div className="mf-cta__actions">
                <Link className="mf-btn mf-btn--primary" href="/app/dashboard">
                  Open UI preview
                </Link>
                <Link className="mf-btn mf-btn--ghost" href="/sign-up">
                  Create an account
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
