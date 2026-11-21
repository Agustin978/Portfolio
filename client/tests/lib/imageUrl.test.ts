import { describe, expect, it } from 'vitest';
import { imageSources, withWidth } from '../../src/lib/imageUrl';

const cloudinary = 'https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/3f2a.webp';
const at = (width: number) =>
  `https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_${width}/v1/portfolio/production/3f2a.webp`;

describe('imageSources', () => {
  it('inserts the transformation right after /upload/', () => {
    expect(withWidth(cloudinary, 800)).toBe(at(800));
  });

  it('offers every fixed width for a full-size image', () => {
    expect(imageSources({ url: cloudinary, width: 1920 })).toEqual({
      src: at(1920),
      srcSet: `${at(400)} 400w, ${at(800)} 800w, ${at(1200)} 1200w, ${at(1920)} 1920w`,
    });
  });

  it('never upscales: only widths up to the image width', () => {
    expect(imageSources({ url: cloudinary, width: 1000 })).toEqual({
      src: at(800),
      srcSet: `${at(400)} 400w, ${at(800)} 800w`,
    });
  });

  it('uses the original URL for an image narrower than 400 px', () => {
    expect(imageSources({ url: cloudinary, width: 320 })).toEqual({ src: cloudinary });
  });

  it.each([
    'https://example.com/upload/shot.png',
    'https://res.cloudinary.com/demo/raw/files/cv.pdf',
    'not a url',
  ])('leaves %s untouched', (url) => {
    expect(imageSources({ url, width: 1920 })).toEqual({ src: url });
  });
});
