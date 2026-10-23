import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { processImage } from '../src/modules/images/images.processing.js';
import {
  animatedPngBuffer,
  gifBuffer,
  jpegBuffer,
  jpegWithGps,
  pngBuffer,
  svgBuffer,
  webpBuffer,
} from './helpers/images.js';

const rejects = (input: Buffer, status: number, code: string) =>
  expect(processImage(input)).rejects.toMatchObject({ statusCode: status, code });

describe('processImage', () => {
  it.each([
    ['jpeg', jpegBuffer],
    ['png', pngBuffer],
    ['webp', webpBuffer],
  ])('accepts %s and re-encodes it as WebP', async (_name, make) => {
    const out = await processImage(await make());

    expect((await sharp(out.data).metadata()).format).toBe('webp');
    expect([out.width, out.height]).toEqual([64, 32]);
  });

  it('rejects SVG and GIF', async () => {
    await rejects(svgBuffer(), 415, 'UNSUPPORTED_IMAGE');
    await rejects(await gifBuffer(), 415, 'UNSUPPORTED_IMAGE');
  });

  it('rejects a file that only pretends to be an image', async () => {
    await rejects(
      Buffer.from('MZ not an image, just a renamed executable'),
      415,
      'UNSUPPORTED_IMAGE',
    );
    await rejects(Buffer.alloc(0), 415, 'UNSUPPORTED_IMAGE');
  });

  it('answers 415, not 500, for a truncated file', async () => {
    // Random pixels don't compress, so the PNG is big enough that cutting it in half is a real truncation.
    const whole = await sharp(randomBytes(400 * 400 * 3), {
      raw: { width: 400, height: 400, channels: 3 },
    })
      .png()
      .toBuffer();

    await rejects(whole.subarray(0, Math.floor(whole.length / 2)), 415, 'UNSUPPORTED_IMAGE');
  });

  it('does not break on an animated PNG', async () => {
    const out = await processImage(await animatedPngBuffer());

    expect((await sharp(out.data).metadata()).format).toBe('webp');
  });

  it('shrinks to 1920 px wide and reports the output size', async () => {
    const out = await processImage(await jpegBuffer(4000, 2000));

    expect([out.width, out.height]).toEqual([1920, 960]);
    const meta = await sharp(out.data).metadata();
    expect([meta.width, meta.height]).toEqual([1920, 960]);
  });

  it('never enlarges a small image', async () => {
    const out = await processImage(await pngBuffer(100, 50));

    expect([out.width, out.height]).toEqual([100, 50]);
  });

  it('applies the EXIF orientation and reports the rotated size', async () => {
    const out = await processImage(await jpegBuffer(100, 50, 6));

    expect([out.width, out.height]).toEqual([50, 100]);
  });

  it('strips EXIF, GPS included', async () => {
    const input = await jpegWithGps();
    expect((await sharp(input).metadata()).exif).toBeDefined();

    const out = await processImage(input);

    expect((await sharp(out.data).metadata()).exif).toBeUndefined();
  });

  it('refuses images above the pixel limit', async () => {
    const huge = await sharp({
      create: { width: 8000, height: 8000, channels: 3, background: '#000' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();

    await rejects(huge, 413, 'IMAGE_TOO_LARGE');
  });
});
