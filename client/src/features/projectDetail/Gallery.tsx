import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ResponsiveImage } from '../../components/ui/ResponsiveImage';
import type { PublicImage } from '../../services/types';

// The main image spans the page column (1040 px minus its padding) on desktop.
const MAIN_SIZES = '(min-width: 1040px) 944px, 100vw';
const THUMB_SIZES = '160px';

interface GalleryProps {
  images: PublicImage[];
  // Fallback alt for images without one.
  title: string;
}

// The cover first, then the other images as thumbnails that swap the main one. No lightbox: the
// main image already uses the full column width.
export function Gallery({ images, title }: GalleryProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const current = images[selected] ?? images[0];
  if (!current) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* A fixed 16:9 frame keeps the page from jumping between images; contain shows each one
          whole (screenshots lose meaning when cropped). */}
      <div className="aspect-video w-full overflow-hidden rounded-card border border-border bg-subtle">
        <ResponsiveImage
          key={current.url}
          image={current}
          alt={current.alt ?? title}
          sizes={MAIN_SIZES}
          priority
          fit="contain"
        />
      </div>

      {images.length > 1 && (
        <div role="group" aria-label={t('projectDetail.gallery')} className="flex flex-wrap gap-3">
          {images.map((image, index) => {
            const active = index === selected;
            return (
              <button
                key={image.url}
                type="button"
                onClick={() => setSelected(index)}
                aria-label={t('projectDetail.showImage', { n: index + 1, total: images.length })}
                aria-current={active ? 'true' : undefined}
                // The selected one gets a thicker dark border, not an outline: the outline is the
                // focus ring and both must be told apart.
                className={`aspect-video w-[clamp(88px,22vw,128px)] cursor-pointer overflow-hidden rounded-lg bg-subtle p-0 transition-[border-color,opacity] ${
                  active
                    ? 'border-2 border-fg'
                    : 'border border-border opacity-70 hover:border-border-hover hover:opacity-100'
                }`}
              >
                {/* The button carries the name; the picture is just its face. */}
                <ResponsiveImage image={image} alt="" sizes={THUMB_SIZES} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
