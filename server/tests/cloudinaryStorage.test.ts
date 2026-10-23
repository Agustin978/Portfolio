import { PassThrough } from 'node:stream';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCloudinaryStorage } from '../src/shared/storage/cloudinaryStorage.js';

const config = { cloudName: 'demo', apiKey: 'key', apiSecret: 'secret' };

type UploadCallback = (error: unknown, result?: { public_id: string; secure_url: string }) => void;

const makeSdk = (
  outcome: (cb: UploadCallback) => void = (cb) =>
    cb(null, { public_id: 'portfolio/test/abc', secure_url: 'https://res.cloudinary.com/x.webp' }),
) => {
  const upload_stream = vi.fn((_options: object, cb: UploadCallback) => {
    const stream = new PassThrough();
    stream.on('finish', () => outcome(cb));
    return stream;
  });
  const destroy = vi.fn().mockResolvedValue({ result: 'ok' });
  const cfg = vi.fn();
  return {
    sdk: { config: cfg, uploader: { upload_stream, destroy } } as never,
    upload_stream,
    destroy,
    cfg,
  };
};

let errorSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

describe('createCloudinaryStorage', () => {
  it('uploads with a server-made id, the environment folder and no overwrite', async () => {
    const { sdk, upload_stream, cfg } = makeSdk();
    const storage = createCloudinaryStorage({ config, folder: 'portfolio/test', sdk });

    const stored = await storage.upload(Buffer.from('x'));

    expect(stored).toEqual({
      publicId: 'portfolio/test/abc',
      url: 'https://res.cloudinary.com/x.webp',
    });
    expect(cfg).toHaveBeenCalledWith(expect.objectContaining({ secure: true, cloud_name: 'demo' }));
    const options = upload_stream.mock.calls[0]![0] as Record<string, unknown>;
    expect(options).toMatchObject({
      folder: 'portfolio/test',
      overwrite: false,
      resource_type: 'image',
    });
    expect(options.public_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(options.timeout).toBeGreaterThan(0);
  });

  it('answers a generic 502 and keeps the provider text in the log', async () => {
    const { sdk } = makeSdk((cb) => cb({ message: 'Invalid api_key abc123', http_code: 401 }));
    const storage = createCloudinaryStorage({ config, folder: 'f', sdk });

    const error = await storage.upload(Buffer.from('x')).catch((e) => e);

    expect(error).toMatchObject({ statusCode: 502, code: 'IMAGE_UPLOAD_FAILED' });
    expect(JSON.stringify(error.message) + JSON.stringify(error.details)).not.toContain('abc123');
    expect(errorSpy).toHaveBeenCalledWith(
      'Cloudinary upload failed',
      expect.objectContaining({ message: 'Invalid api_key abc123', httpCode: 401 }),
    );
  });

  it('answers 503 without credentials and never touches the SDK', async () => {
    const { sdk, upload_stream, cfg } = makeSdk();
    const storage = createCloudinaryStorage({ config: null, folder: 'f', sdk });

    await expect(storage.upload(Buffer.from('x'))).rejects.toMatchObject({
      statusCode: 503,
      code: 'STORAGE_NOT_CONFIGURED',
    });
    expect(upload_stream).not.toHaveBeenCalled();
    expect(cfg).not.toHaveBeenCalled();
  });

  it('destroys by public id', async () => {
    const { sdk, destroy } = makeSdk();
    const storage = createCloudinaryStorage({ config, folder: 'f', sdk });

    await storage.destroy('portfolio/test/abc');

    expect(destroy).toHaveBeenCalledWith(
      'portfolio/test/abc',
      expect.objectContaining({ resource_type: 'image' }),
    );
  });
});
