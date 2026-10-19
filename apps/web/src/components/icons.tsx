import type { ReactNode, SVGProps } from 'react';

/**
 * Inline SVG icon set for the preview — hand-drawn on a 24×24 grid with a
 * consistent 1.75 stroke so the UI stays visually coherent without adding
 * an icon dependency (AGENTS.md scope guards). Icons are decorative:
 * always `aria-hidden`, meaning is carried by adjacent text.
 */
export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>;

/** Internal variant that carries the icon path children. */
type IconInternalProps = SVGProps<SVGSVGElement> & { readonly children: ReactNode };

function Icon({ children, ...props }: IconInternalProps) {
  return (
    <svg
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
    </Icon>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" />
      <path d="M3 7.5V17a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H5.5A2.5 2.5 0 0 1 3 6.5" />
      <circle cx="16.5" cy="14" r="1.1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function TransactionsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <circle cx="4" cy="6" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function BudgetsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M14.5 3.6A9 9 0 0 1 20.4 9.5H14.5V3.6Z" />
    </Icon>
  );
}

export function GoalsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 21V4" />
      <path d="M5 4.5h11l-2.2 3.5L16 11.5H5" />
    </Icon>
  );
}

export function ReportsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h16" />
      <rect x="5.5" y="11" width="3.4" height="6" rx="1" />
      <rect x="10.8" y="7" width="3.4" height="10" rx="1" />
      <rect x="16.1" y="13" width="3.4" height="4" rx="1" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7.5h9" />
      <path d="M17.5 7.5H20" />
      <circle cx="15.2" cy="7.5" r="2.3" />
      <path d="M4 16.5h3" />
      <path d="M11.5 16.5H20" />
      <circle cx="9.2" cy="16.5" r="2.3" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

export function IncomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 4v11" />
      <path d="m7 10.5 5 5 5-5" />
      <path d="M5 20h14" />
    </Icon>
  );
}

export function ExpenseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 20V9" />
      <path d="m7 13.5 5-5 5 5" />
      <path d="M5 4h14" />
    </Icon>
  );
}

export function TransferIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 7h11l-3-3" />
      <path d="M17 17H6l3 3" />
    </Icon>
  );
}

export function AdjustmentIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 4v13" />
      <path d="m5 14 3 3 3-3" />
      <path d="M16 20V7" />
      <path d="m13 10 3-3 3 3" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="7.6" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M11 3.5 12.5 8.6 17.6 10.1 12.5 11.6 11 16.7 9.5 11.6 4.4 10.1 9.5 8.6Z" />
      <path d="M18.4 14.4 19.1 16.7 21.4 17.4 19.1 18.1 18.4 20.4 17.7 18.1 15.4 17.4 17.7 16.7Z" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5 5.5 6v5.1c0 4 2.7 7.5 6.5 8.9 3.8-1.4 6.5-4.9 6.5-8.9V6L12 3.5Z" />
      <path d="m9 11.9 2.1 2.1 4.4-4.3" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function TagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4.5h7L20.5 14a1.4 1.4 0 0 1 0 2l-4.5 4.5a1.4 1.4 0 0 1-2 0L4.5 11V4.5Z" />
      <circle cx="9" cy="9.5" r="1.3" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function EyeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.8 12S6.2 5.9 12 5.9 21.2 12 21.2 12 17.8 18.1 12 18.1 2.8 12 2.8 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2.8 12S6.2 5.9 12 5.9 21.2 12 21.2 12 17.8 18.1 12 18.1 2.8 12 2.8 12Z" />
      <path d="m4.5 4.5 15 15" />
    </Icon>
  );
}
