import sharp from 'sharp';
import { AppError } from '../../shared/errors/AppError.js';

// Render's free tier has 512 MB: no libvips operation cache and one worker thread keep a
// 50-megapixel decode from multiplying into several at once.
sharp.cache(false);
sharp.concurrency(1);

export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_WIDTH = 1920;
const MAX_INPUT_PIXELS = 50_000_000;
const WEBP_QUALITY = 82;

// sharp reads the bytes, so a renamed file or a forged mimetype can't get past this list.
// SVG (script carrier) and GIF are left out on purpose.
const ACCEPTED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export type ProcessedImage = { data: Buffer; width: number; height: number };

const unsupported = () =>
  new AppError(415, 'UNSUPPORTED_IMAGE', 'The file must be a JPEG, PNG or WebP image');

// Anything sharp cannot decode (truncated, corrupt, not an image) is the client's file, not a
// server fault, so it never surfaces as a 500.
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  try {
    const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
    const { format } = await image.metadata();
    if (!format || !ACCEPTED_FORMATS.has(format)) throw unsupported();

    // No withMetadata(): re-encoding drops EXIF, which can carry GPS coordinates. rotate()
    // applies the orientation first so the picture still looks right without it.
    const { data, info } = await image
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (error instanceof Error && /pixel limit/i.test(error.message)) {
      throw new AppError(413, 'IMAGE_TOO_LARGE', 'The image dimensions are too large');
    }
    throw unsupported();
  }
}
