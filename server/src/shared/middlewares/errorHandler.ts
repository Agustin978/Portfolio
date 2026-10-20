import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`));
};

// Express identifies error middleware by its 4-argument signature, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Malformed JSON bodies surface from body-parser as errors with a status of their own.
  const isBadBody = err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large';
  const appError =
    err instanceof AppError
      ? err
      : isBadBody
        ? new AppError(err.status ?? 400, 'INVALID_BODY', 'Invalid request body')
        : null;

  if (!appError) {
    // Unknown errors are logged but never leaked to the client.
    console.error(err);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error', details: null },
    });
    return;
  }

  res.status(appError.statusCode).json({
    success: false,
    error: { code: appError.code, message: appError.message, details: appError.details },
  });
};
