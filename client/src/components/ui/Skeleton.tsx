interface SkeletonProps {
  className?: string;
  // "dark" for the contact panel, where the light tone would glare.
  tone?: 'light' | 'dark';
  // Corner shape lives here instead of in className: two radius utilities would fight.
  shape?: 'block' | 'pill' | 'flat' | 'card';
}

const tones = { light: 'bg-subtle', dark: 'bg-ink' };
const shapes = {
  block: 'rounded-md',
  pill: 'rounded-pill',
  flat: 'rounded-none',
  card: 'rounded-card',
};

export function Skeleton({ className = '', tone = 'light', shape = 'block' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      className={`${tones[tone]} ${shapes[shape]} motion-safe:animate-pulse ${className}`}
    />
  );
}
