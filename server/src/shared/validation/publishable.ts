import { AppError } from '../errors/AppError.js';

const isBlank = (value: unknown) => typeof value !== 'string' || value.trim() === '';

// Names every required field that is null, missing or whitespace-only, as the API calls them
// (titleEn, not title_en). The database CHECK stays as a backstop; this gives the client a list.
export function assertPublishable(values: Record<string, unknown>, required: readonly string[]) {
  const missing = required.filter((field) => isBlank(values[field]));
  if (missing.length > 0) {
    throw new AppError(
      422,
      'INCOMPLETE_TRANSLATION',
      'A published item needs every required field in both languages',
      { missing },
    );
  }
}

export function assertDateRange(start: Date | null, end: Date | null, endField: string) {
  if (start && end && end < start) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid request', {
      [endField]: ['must not be before the start date'],
    });
  }
}

export const invalidReference = (field: string, message: string) =>
  new AppError(422, 'INVALID_REFERENCE', message, { [field]: [message] });
