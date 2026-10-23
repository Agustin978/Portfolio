import type { RequestHandler } from 'express';
import multer from 'multer';
import { AppError } from '../../shared/errors/AppError.js';
import { MAX_INPUT_BYTES } from './images.processing.js';

export const IMAGE_FIELD = 'image';

// Memory storage: the file is re-encoded by sharp before anything touches disk or the host,
// and the 10 MB cap bounds what a single request can make the server hold.
const uploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_INPUT_BYTES,
    files: 1,
    // The image plus altEs / altEn; anything beyond that is not our form.
    parts: 4,
    fields: 3,
    fieldSize: 2 * 1024,
    fieldNameSize: 32,
  },
});

const invalidUpload = (field: string, message: string) =>
  new AppError(400, 'VALIDATION_ERROR', 'Invalid request', { [field]: [message] });

// Multer (and the multipart parser under it) report through their own error types. Mapping them
// here keeps the central handler free of upload details and keeps any of them from becoming a 500.
const toAppError = (error: unknown): unknown => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return new AppError(413, 'IMAGE_TOO_LARGE', 'The image must be 10 MB or smaller');
      case 'LIMIT_UNEXPECTED_FILE':
        return invalidUpload(IMAGE_FIELD, `the file must be sent in the "${IMAGE_FIELD}" field`);
      case 'LIMIT_FILE_COUNT':
        return invalidUpload(IMAGE_FIELD, 'send exactly one file');
      default:
        return invalidUpload('body', 'too many or too large form fields');
    }
  }
  if (error instanceof AppError) return error;
  // A broken multipart body (bad boundary, cut connection) is the client's problem.
  return new AppError(400, 'INVALID_BODY', 'Invalid request body');
};

const single = uploader.single(IMAGE_FIELD);

export const uploadImage: RequestHandler = (req, res, next) => {
  single(req, res, (error?: unknown) => next(error ? toAppError(error) : undefined));
};
