import { Prisma } from '../../generated/prisma/client.js';
import type { AppError } from '../errors/AppError.js';

type PrismaCode = 'P2002' | 'P2003' | 'P2025';

// Handlers may be async: a "in use" message can need a count, but only on the failure path.
export type PrismaErrorHandlers = Partial<
  Record<PrismaCode, (error: Prisma.PrismaClientKnownRequestError) => AppError | Promise<AppError>>
>;

// Turns database constraint failures into AppErrors so they never surface as a 500. Unknown
// errors and codes without a handler are re-thrown untouched. Lives with the repositories
// because they are the only layer that talks to Prisma.
export async function guarded<T>(
  operation: () => Promise<T>,
  handlers: PrismaErrorHandlers,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const handler = handlers[error.code as PrismaCode];
      if (handler) throw await handler(error);
    }
    throw error;
  }
}
