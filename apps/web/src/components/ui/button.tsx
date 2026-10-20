import type { ButtonHTMLAttributes } from 'react';

/**
 * Button primitive for future forms and actions (master prompt §11).
 * Thin wrapper over the existing `.mf-btn` styles — no new visual language.
 * Only the variants justified by real use cases exist: primary actions and
 * low-emphasis ghost actions. Destructive styling arrives with the first
 * destructive workflow that needs it.
 */
type ButtonVariant = 'primary' | 'ghost' | 'danger';

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> & {
  readonly variant?: ButtonVariant;
};

export function Button({ variant = 'primary', type = 'button', ...props }: ButtonProps) {
  const className =
    variant === 'primary'
      ? 'mf-btn mf-btn--primary'
      : variant === 'danger'
        ? 'mf-btn mf-btn--danger'
        : 'mf-btn mf-btn--ghost';
  return <button type={type} className={className} {...props} />;
}
