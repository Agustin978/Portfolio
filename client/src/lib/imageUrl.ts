// Cloudinary builds each variant on first request and that consumes free-tier credits, so the
// site only ever asks for this fixed set of widths.
export const IMAGE_WIDTHS = [400, 800, 1200, 1920] as const;

const UPLOAD_SEGMENT = '/image/upload/';

const isCloudinary = (url: string) => {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'res.cloudinary.com' && parsed.pathname.includes(UPLOAD_SEGMENT);
  } catch {
    return false;
  }
};

// f_auto picks WebP/AVIF per browser, q_auto the quality; w_ resizes.
export const withWidth = (url: string, width: number) =>
  url.replace(UPLOAD_SEGMENT, `${UPLOAD_SEGMENT}f_auto,q_auto,w_${width}/`);

export interface ImageSources {
  src: string;
  srcSet?: string;
}

// Never upscales: only widths up to the image's own width. A URL that is not Cloudinary (or an
// image narrower than the smallest width) is used as is.
export function imageSources(image: { url: string; width: number }): ImageSources {
  if (!isCloudinary(image.url)) return { src: image.url };
  const widths = IMAGE_WIDTHS.filter((width) => width <= image.width);
  if (widths.length === 0) return { src: image.url };
  return {
    src: withWidth(image.url, widths[widths.length - 1]!),
    srcSet: widths.map((width) => `${withWidth(image.url, width)} ${width}w`).join(', '),
  };
}
