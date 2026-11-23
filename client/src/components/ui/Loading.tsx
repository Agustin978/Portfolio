import type { ReactNode } from 'react';

// Wraps skeletons: they are decorative, so screen readers hear the label once per section instead.
export function Loading({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
