import type { Language } from '../i18n/languages';

export interface DatePart {
  // Machine-readable value for <time dateTime>.
  iso: string;
  label: string;
}

export interface DateRange {
  start: DatePart | null;
  // 'present' when the start exists and there is no end: the UI shows "Actualidad" / "Present".
  end: DatePart | 'present' | null;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

// API dates are calendar dates (YYYY-MM-DD). Read and formatted in UTC: new Date() in local time
// would show 2022-01-01 as December 2021 in Argentina.
export function parseIsoDate(value: string | null | undefined): Date | null {
  const match = value ? ISO_DATE.exec(value) : null;
  if (!match) return null;
  const [, year, month, day] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  // Rejects impossible dates such as 2024-02-31, which Date.UTC would roll over.
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
}

export function formatMonthYear(value: string, lang: Language): DatePart | null {
  const date = parseIsoDate(value);
  if (!date) return null;
  const label = new Intl.DateTimeFormat(lang, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
  return { iso: value, label };
}

// null when there is nothing to show, so the whole date line is hidden.
export function dateRange(
  start: string | null,
  end: string | null,
  lang: Language,
): DateRange | null {
  const startPart = start ? formatMonthYear(start, lang) : null;
  const endPart = end ? formatMonthYear(end, lang) : null;
  if (!startPart && !endPart) return null;
  return { start: startPart, end: endPart ?? (startPart ? 'present' : null) };
}
