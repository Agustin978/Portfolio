import { describe, expect, it } from 'vitest';
import { toParagraphs } from '../../src/lib/paragraphs';

describe('toParagraphs', () => {
  it('splits on blank lines and trims each paragraph', () => {
    expect(toParagraphs('  Uno.\n\nDos.  \n\n\nTres.')).toEqual(['Uno.', 'Dos.', 'Tres.']);
  });

  it('treats Windows line endings and whitespace-only lines as blank lines', () => {
    expect(toParagraphs('Uno.\r\n\r\nDos.\n  \t\nTres.')).toEqual(['Uno.', 'Dos.', 'Tres.']);
  });

  it('keeps a single line break inside its paragraph', () => {
    expect(toParagraphs('Línea uno\nlínea dos')).toEqual(['Línea uno\nlínea dos']);
  });

  it('returns nothing for empty text', () => {
    expect(toParagraphs(null)).toEqual([]);
    expect(toParagraphs('')).toEqual([]);
    expect(toParagraphs('\n\n  \n')).toEqual([]);
  });

  it('keeps markup as plain text', () => {
    expect(toParagraphs('<b>hola</b>')).toEqual(['<b>hola</b>']);
  });
});
