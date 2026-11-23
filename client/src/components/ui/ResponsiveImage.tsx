import { imageSources } from '../../lib/imageUrl';
import type { PublicImage } from '../../services/types';

interface ResponsiveImageProps {
  image: PublicImage;
  // The caller decides the fallback (the project title) when the image has no alt.
  alt: string;
  sizes: string;
  // The detail cover is the page's largest element: eager and high priority. Everything else lazy.
  priority?: boolean;
  // contain shows the whole picture (detail gallery); cover fills the frame (cards).
  fit?: 'cover' | 'contain';
  className?: string;
}

// width and height from the API reserve the space before the file arrives (no layout shift).
export function ResponsiveImage({
  image,
  alt,
  sizes,
  priority = false,
  fit = 'cover',
  className = '',
}: ResponsiveImageProps) {
  const { src, srcSet } = imageSources(image);
  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={image.width}
      height={image.height}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : undefined}
      className={`block h-full w-full ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${className}`}
    />
  );
}
