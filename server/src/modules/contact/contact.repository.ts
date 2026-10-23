import { Prisma } from '../../generated/prisma/client.js';
import { guarded } from '../../shared/db/guarded.js';
import type { PrismaClient } from '../../shared/db/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
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

const listSelect = {
  id: true,
  name: true,
  email: true,
  lang: true,
  emailStatus: true,
  sentAt: true,
  isRead: true,
  createdAt: true,
} as const;

const detailSelect = { ...listSelect, message: true, emailError: true } as const;

const ORDER = [{ createdAt: 'desc' }, { id: 'desc' }] as const;

const notFound = () => new AppError(404, 'CONTACT_MESSAGE_NOT_FOUND', 'Contact message not found');

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

  findPage: async ({ isRead, limit, page }: { isRead?: boolean; limit: number; page: number }) => {
    const where = isRead === undefined ? {} : { isRead };
    const [items, total] = await db.$transaction([
      db.contactMessage.findMany({
        where,
        select: listSelect,
        orderBy: [...ORDER],
        take: limit,
        skip: (page - 1) * limit,
      }),
      db.contactMessage.count({ where }),
    ]);
    return { items, total };
  },

  findById: (id: number) => db.contactMessage.findUnique({ where: { id }, select: detailSelect }),

  setRead: (id: number, isRead: boolean) =>
    guarded(
      () => db.contactMessage.update({ where: { id }, data: { isRead }, select: detailSelect }),
      { P2025: notFound },
    ),

  // The only real delete in the API: messages hold personal data and are not content.
  remove: (id: number) =>
    guarded(() => db.contactMessage.delete({ where: { id }, select: { id: true } }), {
      P2025: notFound,
    }),

  countSentSince: (since: Date) =>
    db.contactMessage.count({ where: { emailStatus: 'sent', sentAt: { gte: since } } }),
});

export { notFound as contactMessageNotFound };
export type ContactRepository = ReturnType<typeof createContactRepository>;
