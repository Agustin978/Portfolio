import { describe, expect, it } from 'vitest';
import tokensCss from '../src/styles/tokens.css?raw';

// Reads the real values from tokens.css, so changing a color re-checks its contrast.
const token = (name: string) => {
  const match = new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6});`).exec(tokensCss);
  if (!match) throw new Error(`Token --color-${name} not found`);
  return match[1]!;
};

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string) => {
  const [light, dark] = [luminance(token(a)), luminance(token(b))].sort((x, y) => y - x) as [
    number,
    number,
  ];
  return (light + 0.05) / (dark + 0.05);
};

// WCAG AA: 4.5:1 for text, 3:1 for field borders and focus indicators.
describe('token contrast', () => {
  it.each([
    ['fg', 'bg'],
    ['muted', 'bg'],
    ['muted', 'surface'],
    ['accent', 'bg'],
    ['accent', 'surface'],
    ['fg-soft', 'subtle'],
    ['bg', 'fg'],
    ['border-strong', 'fg'],
    ['bg', 'ink'],
    ['danger-on-dark', 'fg'],
    ['danger-on-dark', 'ink'],
    ['border-hover', 'fg'],
  ])('text %s on %s reaches 4.5:1', (text, background) => {
    expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['border-field', 'fg'],
    ['focus-ring', 'bg'],
    ['focus-ring', 'surface'],
    ['focus-ring-inverse', 'fg'],
    ['danger-on-dark', 'ink'],
  ])('%s on %s reaches 3:1', (indicator, background) => {
    expect(contrast(indicator, background)).toBeGreaterThanOrEqual(3);
  });
});
