// A placeholder with the final shape. Pulses only when the person has not asked for reduced motion;
// the loading message for screen readers lives in the section, not in each block.
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      className={`rounded-md bg-subtle motion-safe:animate-pulse ${className}`}
    />
  );
}
