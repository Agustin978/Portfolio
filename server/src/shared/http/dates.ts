// Prisma returns @db.Date columns as midnight UTC; the API exposes them as plain calendar dates.
export const toDateOnly = (value: Date | null): string | null =>
  value ? value.toISOString().slice(0, 10) : null;
