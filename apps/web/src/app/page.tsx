import type { Metadata } from 'next';
import Link from 'next/link';

import { I18nText } from '@/components/i18n-text';
import { LandingTopbar } from '@/components/landing-topbar';
import { ProductPreview } from '@/components/product-preview';
import { SiteFooter } from '@/components/site-footer';
import type { TranslationKey } from '@/lib/i18n/translations';
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

const BENEFITS: readonly {
  readonly titleKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly tag: 'MVP' | 'V1';
  readonly icon: string;
  readonly Icon: typeof WalletIcon;
}[] = [
  {
    titleKey: 'landing.benefit.spending.title',
    descriptionKey: 'landing.benefit.spending.body',
    tag: 'MVP',
    icon: 'blue',
    Icon: WalletIcon,
  },
  {
    titleKey: 'landing.benefit.saving.title',
    descriptionKey: 'landing.benefit.saving.body',
    tag: 'MVP',
    icon: 'purple',
    Icon: GoalsIcon,
  },
  {
    titleKey: 'landing.benefit.planning.title',
    descriptionKey: 'landing.benefit.planning.body',
    tag: 'MVP',
    icon: 'cyan',
    Icon: BudgetsIcon,
  },
  {
    titleKey: 'landing.benefit.picture.title',
    descriptionKey: 'landing.benefit.picture.body',
    tag: 'MVP',
    icon: 'warm',
    Icon: DashboardIcon,
  },
  {
    titleKey: 'landing.benefit.goals.title',
    descriptionKey: 'landing.benefit.goals.body',
    tag: 'MVP',
    icon: 'blue',
    Icon: GoalsIcon,
  },
  {
    titleKey: 'landing.benefit.customise.title',
    descriptionKey: 'landing.benefit.customise.body',
    tag: 'MVP',
    icon: 'purple',
    Icon: ReportsIcon,
  },
  {
    titleKey: 'landing.benefit.assistant.title',
    descriptionKey: 'landing.benefit.assistant.body',
    tag: 'V1',
    icon: 'cyan',
    Icon: SparkleIcon,
  },
];

const STEPS: readonly {
  readonly step: string;
  readonly titleKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}[] = [
  {
    step: '01',
    titleKey: 'landing.step.setup.title',
    descriptionKey: 'landing.step.setup.body',
  },
  {
    step: '02',
    titleKey: 'landing.step.record.title',
    descriptionKey: 'landing.step.record.body',
  },
  {
    step: '03',
    titleKey: 'landing.step.review.title',
    descriptionKey: 'landing.step.review.body',
  },
];

const TRUST_POINTS: readonly {
  readonly titleKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
}[] = [
  {
    titleKey: 'landing.trust.records.title',
    descriptionKey: 'landing.trust.records.body',
  },
  {
    titleKey: 'landing.trust.numbers.title',
    descriptionKey: 'landing.trust.numbers.body',
  },
  {
    titleKey: 'landing.trust.bank.title',
    descriptionKey: 'landing.trust.bank.body',
  },
  {
    titleKey: 'landing.trust.language.title',
    descriptionKey: 'landing.trust.language.body',
  },
];

const ROADMAP: readonly {
  readonly levelKey: TranslationKey;
  readonly stateKey: TranslationKey;
  readonly scopeKey: TranslationKey;
}[] = [
  {
    levelKey: 'landing.roadmap.mvp.level',
    stateKey: 'landing.roadmap.mvp.state',
    scopeKey: 'landing.roadmap.mvp.scope',
  },
  {
    levelKey: 'landing.roadmap.v1.level',
    stateKey: 'landing.roadmap.v1.state',
    scopeKey: 'landing.roadmap.v1.scope',
  },
  {
    levelKey: 'landing.roadmap.later.level',
    stateKey: 'landing.roadmap.later.state',
    scopeKey: 'landing.roadmap.later.scope',
  },
];

/** Personal-control highlights (requirements.md §5.7; single layout in MVP per DR-12). */
const CONTROL_POINTS: readonly {
  readonly titleKey: TranslationKey;
  readonly descriptionKey: TranslationKey;
  readonly Icon: typeof WalletIcon;
}[] = [
  {
    titleKey: 'landing.control.categories.title',
    descriptionKey: 'landing.control.categories.body',
    Icon: TagIcon,
  },
  {
    titleKey: 'landing.control.dashboard.title',
    descriptionKey: 'landing.control.dashboard.body',
    Icon: DashboardIcon,
  },
  {
    titleKey: 'landing.control.preferences.title',
    descriptionKey: 'landing.control.preferences.body',
    Icon: SettingsIcon,
  },
  {
    titleKey: 'landing.control.goals.title',
    descriptionKey: 'landing.control.goals.body',
    Icon: GoalsIcon,
  },
];

/**
 * Grounded answers only (requirements.md §§1–5, §10; DR-08/13/16/17).
 * Pricing is undecided (DR-17), so no pricing question is included.
 */
const FAQ: readonly {
  readonly qKey: TranslationKey;
  readonly aKey: TranslationKey;
}[] = [
  { qKey: 'landing.faq.what.q', aKey: 'landing.faq.what.a' },
  { qKey: 'landing.faq.who.q', aKey: 'landing.faq.who.a' },
  { qKey: 'landing.faq.track.q', aKey: 'landing.faq.track.a' },
  { qKey: 'landing.faq.categories.q', aKey: 'landing.faq.categories.a' },
  { qKey: 'landing.faq.savings.q', aKey: 'landing.faq.savings.a' },
  { qKey: 'landing.faq.bank.q', aKey: 'landing.faq.bank.a' },
  { qKey: 'landing.faq.privacy.q', aKey: 'landing.faq.privacy.a' },
];

export default function Home() {
  // Illustrative literal for the marketing composition below — never a
  // calculation and never presented as a real account (AGENTS.md rule 12).
  const goal = MOCK_SAVINGS_GOALS[0];

  return (
    <div className="mf-landing">
      <a className="mf-skip-link" href="#main-content">
        <I18nText k="app.skipToContent" />
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
            <p className="mf-hero__eyebrow">
              <I18nText k="landing.heroEyebrow" />
            </p>
            <h1 className="mf-hero__title" id="hero-title">
              <I18nText k="landing.heroTitle" />{' '}
              <span className="mf-hero__accent">
                <I18nText k="landing.heroAccent" />
              </span>
            </h1>
            <p className="mf-hero__lead">
              <I18nText k="landing.heroLead" />
            </p>
            <div className="mf-hero__actions">
              <Link className="mf-btn mf-btn--primary" href="/sign-up">
                <I18nText k="common.getStarted" />
              </Link>
              <Link className="mf-btn mf-btn--ghost" href="#capabilities">
                <I18nText k="landing.exploreFeatures" />
              </Link>
            </div>
            <p className="mf-hero__trust">
              <I18nText k="landing.heroTrust" />
            </p>
          </div>
          <div className="mf-hero__preview">
            <ProductPreview />
          </div>
        </section>

        {/* Status note */}
        <div className="mf-landing-container">
          <div className="mf-status-note">
            <p className="mf-status-note__title">
              <I18nText k="landing.statusTitle" />
            </p>
            <p className="mf-status-note__body">
              <I18nText k="landing.statusBody" />
            </p>
          </div>
        </div>

        {/* Capabilities */}
        <section id="capabilities" className="mf-section" aria-labelledby="capabilities-title">
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">
              <I18nText k="landing.capabilitiesEyebrow" />
            </p>
            <h2 className="mf-section__title" id="capabilities-title">
              <I18nText k="landing.capabilitiesTitle" />
            </h2>
            <p className="mf-section__subtitle">
              <I18nText k="landing.capabilitiesSubtitle" />
            </p>
            <ul className="mf-feature-grid">
              {BENEFITS.map((feature) => (
                <li key={feature.titleKey} className="mf-feature">
                  <div
                    className={`mf-feature__icon mf-feature__icon--${feature.icon}`}
                    aria-hidden="true"
                  >
                    <feature.Icon />
                  </div>
                  <div className="mf-feature__head">
                    <h3 className="mf-feature__title">
                      <I18nText k={feature.titleKey} />
                    </h3>
                    <span
                      className={`mf-feature__tag mf-feature__tag--${feature.tag.toLowerCase()}`}
                    >
                      {feature.tag}
                    </span>
                  </div>
                  <p className="mf-feature__text">
                    <I18nText k={feature.descriptionKey} />
                  </p>
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
            <p className="mf-section__eyebrow">
              <I18nText k="landing.howEyebrow" />
            </p>
            <h2 className="mf-section__title" id="how-it-works-title">
              <I18nText k="landing.howTitle" />
            </h2>
            <p className="mf-section__subtitle">
              <I18nText k="landing.howSubtitle" />
            </p>
            <ol className="mf-steps">
              {STEPS.map((step) => (
                <li key={step.step} className="mf-step">
                  <span className="mf-step__number" aria-hidden="true">
                    {step.step}
                  </span>
                  <div>
                    <h3 className="mf-step__title">
                      <I18nText k={step.titleKey} />
                    </h3>
                    <p className="mf-step__text">
                      <I18nText k={step.descriptionKey} />
                    </p>
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
                <p className="mf-section__eyebrow">
                  <I18nText k="landing.goalsEyebrow" />
                </p>
                <h2 className="mf-section__title" id="savings-goals-title">
                  <I18nText k="landing.goalsTitle" />
                </h2>
                <p className="mf-section__subtitle">
                  <I18nText k="landing.goalsSubtitle" />
                </p>
                <ul className="mf-goal-visual__examples">
                  <li>
                    <I18nText k="landing.goal.emergency" />
                  </li>
                  <li>
                    <I18nText k="landing.goal.laptop" />
                  </li>
                  <li>
                    <I18nText k="landing.goal.education" />
                  </li>
                  <li>
                    <I18nText k="landing.goal.personal" />
                  </li>
                </ul>
              </div>
              {goal ? (
                <div className="mf-goal-visual__panel">
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
                      <span className="mf-goal-visual__cap">
                        <I18nText k="landing.goal.percentOfGoal" />
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="mf-goal-visual__name">
                      <I18nText k={goal.nameKey} />
                    </p>
                    <p className="mf-goal-visual__amount">
                      {goal.saved} / {goal.target}
                    </p>
                    <p className="mf-goal-visual__note">
                      <I18nText k="landing.goal.demoNote" />
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
            <p className="mf-section__eyebrow">
              <I18nText k="landing.controlEyebrow" />
            </p>
            <h2 className="mf-section__title" id="control-title">
              <I18nText k="landing.controlTitle" />
            </h2>
            <p className="mf-section__subtitle">
              <I18nText k="landing.controlSubtitle" />
            </p>
            <ul className="mf-feature-grid">
              {CONTROL_POINTS.map((point) => (
                <li key={point.titleKey} className="mf-feature">
                  <div className="mf-feature__icon mf-feature__icon--blue" aria-hidden="true">
                    <point.Icon />
                  </div>
                  <h3 className="mf-feature__title">
                    <I18nText k={point.titleKey} />
                  </h3>
                  <p className="mf-feature__text">
                    <I18nText k={point.descriptionKey} />
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="mf-section" aria-labelledby="trust-title">
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">
              <I18nText k="landing.trustEyebrow" />
            </p>
            <h2 className="mf-section__title" id="trust-title">
              <I18nText k="landing.trustTitle" />
            </h2>
            <p className="mf-section__subtitle">
              <I18nText k="landing.trustSubtitle" />
            </p>
            <ul className="mf-trust-grid">
              {TRUST_POINTS.map((point) => (
                <li key={point.titleKey} className="mf-trust">
                  <div className="mf-trust__icon" aria-hidden="true">
                    <ShieldIcon />
                  </div>
                  <h3 className="mf-trust__title">
                    <I18nText k={point.titleKey} />
                  </h3>
                  <p className="mf-trust__text">
                    <I18nText k={point.descriptionKey} />
                  </p>
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
            <p className="mf-section__eyebrow">
              <I18nText k="landing.roadmapEyebrow" />
            </p>
            <h2 className="mf-section__title" id="roadmap-title">
              <I18nText k="landing.roadmapTitle" />
            </h2>
            <p className="mf-section__subtitle">
              <I18nText k="landing.roadmapSubtitle" />
            </p>
            <ul className="mf-roadmap">
              {ROADMAP.map((item) => (
                <li key={item.levelKey} className="mf-roadmap__row">
                  <span className="mf-roadmap__level">
                    <I18nText k={item.levelKey} />
                  </span>
                  <span className="mf-roadmap__state">
                    <I18nText k={item.stateKey} />
                  </span>
                  <span className="mf-roadmap__scope">
                    <I18nText k={item.scopeKey} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ (grounded answers only; pricing omitted — DR-17) */}
        <section id="faq" className="mf-section" aria-labelledby="faq-title">
          <div className="mf-landing-container">
            <p className="mf-section__eyebrow">
              <I18nText k="landing.faqEyebrow" />
            </p>
            <h2 className="mf-section__title" id="faq-title">
              <I18nText k="landing.faqTitle" />
            </h2>
            <p className="mf-section__subtitle">
              <I18nText k="landing.faqSubtitle" />
            </p>
            <div className="mf-faq">
              {FAQ.map((item) => (
                <details key={item.qKey} className="mf-faq__item" name="moneyflow-faq">
                  <summary className="mf-faq__question">
                    <I18nText k={item.qKey} />
                  </summary>
                  <p className="mf-faq__answer">
                    <I18nText k={item.aKey} />
                  </p>
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
                  <I18nText k="landing.ctaTitle" />
                </h2>
                <p className="mf-cta__text">
                  <I18nText k="landing.ctaBody" />
                </p>
              </div>
              <div className="mf-cta__actions">
                <Link className="mf-btn mf-btn--primary" href="/sign-up">
                  <I18nText k="landing.ctaCreate" />
                </Link>
                <Link className="mf-btn mf-btn--ghost" href="/sign-in">
                  <I18nText k="common.signIn" />
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
