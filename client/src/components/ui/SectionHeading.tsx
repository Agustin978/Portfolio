import type { ReactNode } from 'react';

// The h2 of every section; its id is what the section's aria-labelledby points to.
export function SectionHeading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="m-0 text-[clamp(28px,4vw,40px)] font-semibold leading-[1.1] tracking-[-0.03em]"
    >
      {children}
    </h2>
  );
}
