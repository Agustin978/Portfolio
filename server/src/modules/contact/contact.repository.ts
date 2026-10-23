import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../shared/db/prisma.js';
import type { ContactInput } from './contact.schemas.js';

// The visitor's name, email and message must never reach the logs. A Prisma error can embed the
// submitted values in its text, so a failed write is replaced by one that carries only the code.
const withoutVisitorData = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'unknown';
    throw new Error(`Contact message write failed (${code})`);
  }
};

export type ContactOutcome = { emailStatus: 'failed'; emailError: string };

export const createContactRepository = (db: PrismaClient) => ({
  // Without an outcome the row starts as pending, the column default.
  create: (input: ContactInput, outcome?: ContactOutcome) =>
    withoutVisitorData(() =>
      db.contactMessage.create({ data: { ...input, ...outcome }, select: { id: true } }),
    ),

  markSent: (id: number, sentAt: Date) =>
    db.contactMessage.update({
      where: { id },
      data: { emailStatus: 'sent', sentAt, emailError: null },
      select: { id: true },
    }),

  markFailed: (id: number, emailError: string) =>
    db.contactMessage.update({
      where: { id },
      data: { emailStatus: 'failed', emailError },
      select: { id: true },
    }),

  countSentSince: (since: Date) =>
    db.contactMessage.count({ where: { emailStatus: 'sent', sentAt: { gte: since } } }),
});

export type ContactRepository = ReturnType<typeof createContactRepository>;
