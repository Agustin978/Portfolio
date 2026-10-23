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

export const createContactRepository = (db: PrismaClient) => ({
  create: (input: ContactInput) =>
    withoutVisitorData(() => db.contactMessage.create({ data: input, select: { id: true } })),
});

export type ContactRepository = ReturnType<typeof createContactRepository>;
