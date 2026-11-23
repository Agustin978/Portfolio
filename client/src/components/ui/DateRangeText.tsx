import type { DateRange } from '../../lib/dates';

interface DateRangeTextProps {
  range: DateRange;
  // "Actualidad" / "Present", for a range that has not ended.
  presentLabel: string;
  className?: string;
}

// Each date (month and year) never breaks, and the no-break space keeps the dash with the start:
// the only place the line can wrap is right after the dash.
const RANGE_SEPARATOR = ' — ';

// The shared date line of experience entries and project details: "ene 2022 — Actualidad".
// Each date is a <time> with its calendar value.
export function DateRangeText({ range, presentLabel, className = '' }: DateRangeTextProps) {
  const { start, end } = range;
  return (
    <p
      className={`m-0 font-mono text-[13px] leading-[1.7] tracking-[0.04em] uppercase ${className}`}
    >
      {start && (
        <time dateTime={start.iso} className="whitespace-nowrap">
          {start.label}
        </time>
      )}
      {start && end && RANGE_SEPARATOR}
      {end === 'present' ? (
        <span className="whitespace-nowrap">{presentLabel}</span>
      ) : (
        end && (
          <time dateTime={end.iso} className="whitespace-nowrap">
            {end.label}
          </time>
        )
      )}
    </p>
  );
}
