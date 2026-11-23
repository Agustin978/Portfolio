import { describe, expect, it } from 'vitest';
import { dateRange, formatMonthYear, parseIsoDate } from '../../src/lib/dates';

describe('parseIsoDate', () => {
  it('reads the calendar date in UTC', () => {
    expect(parseIsoDate('2022-01-01')?.toISOString()).toBe('2022-01-01T00:00:00.000Z');
  });

  it.each([null, '', '2022-1-1', '2022-02-31', '2022-13-01', '01/02/2022'])(
    'rejects %s',
    (value) => {
      expect(parseIsoDate(value)).toBeNull();
    },
  );
});

describe('formatMonthYear', () => {
  // The first day of a month must not slip to the previous month west of UTC (Argentina).
  it('keeps the month of the first day in both languages', () => {
    expect(formatMonthYear('2022-01-01', 'es')).toEqual({ iso: '2022-01-01', label: 'ene 2022' });
    expect(formatMonthYear('2022-01-01', 'en')).toEqual({ iso: '2022-01-01', label: 'Jan 2022' });
  });

  it('returns null for a value that is not a date', () => {
    expect(formatMonthYear('soon', 'es')).toBeNull();
  });
});

describe('dateRange', () => {
  it('hides the line when both dates are missing', () => {
    expect(dateRange(null, null, 'es')).toBeNull();
  });

  it('shows "present" when it started and has not ended', () => {
    expect(dateRange('2025-05-01', null, 'es')).toEqual({
      start: { iso: '2025-05-01', label: 'may 2025' },
      end: 'present',
    });
  });

  it('shows both ends when both exist', () => {
    expect(dateRange('2023-03-01', '2024-06-30', 'en')).toEqual({
      start: { iso: '2023-03-01', label: 'Mar 2023' },
      end: { iso: '2024-06-30', label: 'Jun 2024' },
    });
  });

  it('shows only the end when there is no start', () => {
    expect(dateRange(null, '2024-06-30', 'en')).toEqual({
      start: null,
      end: { iso: '2024-06-30', label: 'Jun 2024' },
    });
  });
});
