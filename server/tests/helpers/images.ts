import { crc32 } from 'node:zlib';
import sharp from 'sharp';

const base = { width: 64, height: 32, channels: 3 as const, background: '#336699' };

export const jpegBuffer = (width = 64, height = 32, orientation?: number) =>
  sharp({ create: { ...base, width, height } })
    .jpeg()
    .withMetadata(orientation ? { orientation } : {})
    .toBuffer();

export const pngBuffer = (width = 64, height = 32) =>
  sharp({ create: { ...base, width, height } })
    .png()
    .toBuffer();

export const webpBuffer = (width = 64, height = 32) =>
  sharp({ create: { ...base, width, height } })
    .webp()
    .toBuffer();

export const gifBuffer = () => sharp({ create: base }).gif().toBuffer();

export const svgBuffer = () =>
  Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><script>1</script></svg>',
  );

// Real JPEG whose EXIF block carries a GPS position.
export const jpegWithGps = () =>
  sharp({ create: base })
    .jpeg()
    .withExif({
      IFD0: { Copyright: 'someone' },
      IFD3: { GPSLatitudeRef: 'N', GPSLongitudeRef: 'W' },
    })
    .toBuffer();

const chunk = (type: string, body: Buffer) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, crc]);
};

// A PNG carrying an acTL (animation control) chunk, which is what makes it an APNG.
export async function animatedPngBuffer() {
  const png = await pngBuffer();
  const ihdrEnd = 8 + 8 + 13 + 4;
  const actl = Buffer.alloc(8);
  actl.writeUInt32BE(2, 0);
  return Buffer.concat([png.subarray(0, ihdrEnd), chunk('acTL', actl), png.subarray(ihdrEnd)]);
}

// Placeholder bytes for tests that only need *an* image to exist.
export const tinyImage = () => pngBuffer(8, 8);
