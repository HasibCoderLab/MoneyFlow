type ProgressBarProps = {
  readonly label: string;
  /** Literal percentage (0–100) from sample data — never derived here. */
  readonly percent: number;
  /** Human-readable value text, e.g. "BDT 8,000 of BDT 30,000". */
  readonly valueText: string;
  /** Renders the "close to limit" treatment; meaning is also in the text. */
  readonly emphasis?: 'normal' | 'attention';
};

/**
 * Accessible determinate progress indicator (goals, budgets). The numeric
 * meaning is carried by ARIA attributes and visible text; the bar itself
 * is decoration and never the only signal (requirements.md §7.3).
 */
export function ProgressBar({ label, percent, valueText, emphasis = 'normal' }: ProgressBarProps) {
  return (
    <div
      className={`mf-progress mf-progress--${emphasis}`}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-valuetext={valueText}
    >
      <div className="mf-progress__track" aria-hidden="true">
        <div className="mf-progress__fill" style={{ width: `${percent}%` }} />
      </div>
      <p className="mf-progress__text">
        <span>{valueText}</span>
        <span>{percent}%</span>
      </p>
    </div>
  );
}
