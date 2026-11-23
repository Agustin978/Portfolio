import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateRangeText } from '../../src/components/ui/DateRangeText';
import { dateRange } from '../../src/lib/dates';
import type { Language } from '../../src/i18n/languages';

function renderRange(start: string | null, end: string | null, lang: Language, present: string) {
  const range = dateRange(start, end, lang)!;
  const { container } = render(<DateRangeText range={range} presentLabel={present} />);
  return container.querySelector('p')!;
}

// The unbreakable parts of the line: each date and "Actualidad" / "Present".
const units = (line: HTMLElement) =>
  [...line.children].map((unit) => ({
    text: unit.textContent,
    nowrap: unit.classList.contains('whitespace-nowrap'),
  }));

describe('DateRangeText', () => {
  it.each([
    // A finished range, in both languages.
    ['2019-03-01', '2021-12-31', 'es', 'Actualidad', ['mar 2019', 'dic 2021']],
    ['2019-03-01', '2021-12-31', 'en', 'Present', ['Mar 2019', 'Dec 2021']],
    // Still going.
    ['2025-05-01', null, 'es', 'Actualidad', ['may 2025', 'Actualidad']],
    ['2025-05-01', null, 'en', 'Present', ['May 2025', 'Present']],
    // The longest labels: "sept" in Spanish, and "Actualidad".
    ['2019-09-01', null, 'es', 'Actualidad', ['sept 2019', 'Actualidad']],
    ['2019-09-01', '2024-09-30', 'es', 'Actualidad', ['sept 2019', 'sept 2024']],
  ] as const)(
    'keeps %s – %s (%s) as two unbreakable dates that can only wrap after the dash',
    (start, end, lang, present, expected) => {
      const line = renderRange(start, end, lang, present);

      expect(units(line)).toEqual(expected.map((text) => ({ text, nowrap: true })));
      // A no-break space before the dash and a normal one after it: the only break opportunity.
      expect(line.textContent).toBe(`${expected[0]} — ${expected[1]}`);
      expect(line.childNodes[1]!.textContent).toBe(' — ');
    },
  );

  it('shows a lone date without a dash, still unbreakable', () => {
    const line = renderRange(null, '2024-11-30', 'es', 'Actualidad');
    expect(line.textContent).toBe('nov 2024');
    expect(units(line)).toEqual([{ text: 'nov 2024', nowrap: true }]);
  });
});
