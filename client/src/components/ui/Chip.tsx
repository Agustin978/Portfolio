import type { ReactNode } from 'react';

// A static tag (technology names). Filter buttons are interactive and live with the filter.
export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-subtle px-2 py-1 font-mono text-xs text-fg-soft">
      {children}
    </span>
  );
}
