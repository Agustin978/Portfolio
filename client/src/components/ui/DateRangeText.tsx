import type { DateRange } from '../../lib/dates';

interface DateRangeTextProps {
  range: DateRange;
  // "Actualidad" / "Present", for a range that has not ended.
  presentLabel: string;
  className?: string;
}

// The shared date line of experience entries and project details: "ene 2022 — Actualidad".
// Each date is a <time> with its calendar value.
export function DateRangeText({ range, presentLabel, className = '' }: DateRangeTextProps) {
  const { start, end } = range;
  return (
    <p
      className={`m-0 font-mono text-[13px] leading-[1.7] tracking-[0.04em] uppercase ${className}`}
    >
      {start && <time dateTime={start.iso}>{start.label}</time>}
      {start && end && ' — '}
      {end === 'present' ? (
        <span>{presentLabel}</span>
      ) : (
        end && <time dateTime={end.iso}>{end.label}</time>
      )}
    </p>
  );
}
