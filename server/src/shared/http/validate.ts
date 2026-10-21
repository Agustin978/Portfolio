import { z } from 'zod';
import { AppError } from '../errors/AppError.js';

// Details carry field messages only, never the submitted values.
export const validate = <S extends z.ZodType>(schema: S, input: unknown): z.output<S> => {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Invalid request',
      z.flattenError(parsed.error).fieldErrors,
    );
  }
  return parsed.data;
};

// Postgres INTEGER tops out at 2^31 - 1; anything larger can never match a row.
const idSchema = z
  .string()
  .regex(/^[1-9]\d{0,9}$/)
  .transform(Number)
  .pipe(z.number().max(2_147_483_647));

export const parseId = (raw: unknown): number => {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid id', {
      id: ['must be a positive integer'],
    });
  }
  return parsed.data;
};
