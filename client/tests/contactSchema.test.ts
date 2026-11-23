import { describe, expect, it } from 'vitest';
import {
  contactSchema,
  EMAIL_MAX,
  MESSAGE_MAX,
  MESSAGE_MIN,
  NAME_MAX,
} from '../src/features/contact/contactSchema';

// Fixes the limits of server/src/modules/contact/contact.schemas.ts. If this fails after a
// server change, update both files together.
const valid = { name: 'Ana', email: 'ana@example.com', message: 'Hola, ¿cómo va?', hp_check: '' };
const issue = (values: Partial<typeof valid>) => {
  const result = contactSchema.safeParse({ ...valid, ...values });
  return result.success ? null : result.error.issues[0]!.message;
};

describe('contact schema (mirror of the server)', () => {
  it('has the server limits', () => {
    expect({ NAME_MAX, EMAIL_MAX, MESSAGE_MIN, MESSAGE_MAX }).toEqual({
      NAME_MAX: 100,
      EMAIL_MAX: 254,
      MESSAGE_MIN: 10,
      MESSAGE_MAX: 5000,
    });
  });

  it('trims every field before checking it', () => {
    const parsed = contactSchema.parse({
      ...valid,
      name: '  Ana  ',
      email: ' ana@example.com ',
      message: `\n${'a'.repeat(10)}\n`,
    });
    expect(parsed).toMatchObject({
      name: 'Ana',
      email: 'ana@example.com',
      message: 'a'.repeat(10),
    });
    expect(issue({ name: '   ' })).toBe('form.errors.required');
    expect(issue({ message: `  ${'a'.repeat(9)}  ` })).toBe('form.errors.messageTooShort');
  });

  it.each([
    [{ name: '' }, 'form.errors.required'],
    [{ name: 'a'.repeat(NAME_MAX) }, null],
    [{ name: 'a'.repeat(NAME_MAX + 1) }, 'form.errors.nameTooLong'],
    [{ name: 'Ana\nPérez' }, 'form.errors.nameInvalid'],
    [{ name: 'Ana\tPérez' }, 'form.errors.nameInvalid'],
    [{ name: 'Ana Pérez' }, 'form.errors.nameInvalid'],
    [{ email: '' }, 'form.errors.required'],
    [{ email: 'no-es-un-email' }, 'form.errors.emailInvalid'],
    [{ email: `${'a'.repeat(EMAIL_MAX - 12)}@example.com` }, null],
    [{ email: `${'a'.repeat(EMAIL_MAX - 11)}@example.com` }, 'form.errors.emailInvalid'],
    [{ message: '' }, 'form.errors.required'],
    [{ message: 'a'.repeat(MESSAGE_MIN - 1) }, 'form.errors.messageTooShort'],
    [{ message: 'a'.repeat(MESSAGE_MIN) }, null],
    [{ message: 'a'.repeat(MESSAGE_MAX) }, null],
    [{ message: 'a'.repeat(MESSAGE_MAX + 1) }, 'form.errors.messageTooLong'],
    [{ message: 'Línea uno\n\nLínea dos' }, null],
    [{ message: `Hola\u0000${'a'.repeat(10)}` }, 'form.errors.messageInvalid'],
  ])('%o gives %s', (values, expected) => {
    expect(issue(values)).toBe(expected);
  });
});
