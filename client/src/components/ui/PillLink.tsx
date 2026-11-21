import type { ReactNode } from 'react';

export type PillVariant = 'primary' | 'secondary' | 'light' | 'ghost';

const base =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-pill px-6 text-base font-medium no-underline transition-colors';

const variants: Record<PillVariant, string> = {
  primary: 'bg-fg text-bg hover:bg-fg-soft',
  secondary: 'border border-border-strong text-fg hover:bg-subtle',
  // For the dark panel.
  light: 'bg-bg text-fg hover:bg-border',
  ghost: 'border border-muted text-bg hover:bg-ink',
};

export const pillClassName = (variant: PillVariant) => `${base} ${variants[variant]}`;

interface PillLinkProps {
  href: string;
  variant: PillVariant;
  children: ReactNode;
  // Decorative icon before the text (hidden from screen readers by the icon itself).
  icon?: ReactNode;
  // For links that open in a new tab: the text only screen readers hear, e.g. "(opens in a new tab)".
  newTabLabel?: string;
}

export function PillLink({ href, variant, children, icon, newTabLabel }: PillLinkProps) {
  const external = newTabLabel !== undefined;
  return (
    <a
      href={href}
      className={pillClassName(variant)}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {icon}
      {children}
      {/* The space sits outside the span: inside it, the accessible name drops it. */}
      {external && (
        <>
          {' '}
          <span className="sr-only">{newTabLabel}</span>
        </>
      )}
    </a>
  );
}
