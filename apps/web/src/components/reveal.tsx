'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type RevealProps = {
  readonly children: ReactNode;
  /** Stagger delay in ms for cascading entrances. */
  readonly delay?: number;
  readonly className?: string;
};

/**
 * Scroll-triggered reveal wrapper (landing only).
 *
 * SSR renders content visible (safe with JS disabled); the client enhances
 * with an IntersectionObserver entrance when motion is welcome. Decorative
 * only — never gates content: reduced-motion users, missing observers
 * (e.g. test environments), and unsupported browsers all see content
 * immediately with no animation classes applied.
 */
export function Reveal({ children, delay = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setVisible(true);
      return;
    }
    el.classList.add('mf-reveal');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`mf-reveal${visible ? ' mf-reveal--visible' : ''}${className ? ` ${className}` : ''}`}
      style={delay > 0 ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
