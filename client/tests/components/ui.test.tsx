import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Chip } from '../../src/components/ui/Chip';
import { EmptyBlock } from '../../src/components/ui/EmptyBlock';
import { ErrorBlock } from '../../src/components/ui/ErrorBlock';
import { PillLink } from '../../src/components/ui/PillLink';
import { ResponsiveImage } from '../../src/components/ui/ResponsiveImage';
import { SectionHeading } from '../../src/components/ui/SectionHeading';
import { Skeleton } from '../../src/components/ui/Skeleton';
import { SocialIcon } from '../../src/components/ui/SocialIcon';

const cloudinary = 'https://res.cloudinary.com/demo/image/upload/v1/portfolio/production/3f2a.webp';

describe('PillLink', () => {
  it('is a plain link by default', () => {
    render(
      <PillLink href="#contacto" variant="secondary">
        Contacto
      </PillLink>,
    );
    const link = screen.getByRole('link', { name: 'Contacto' });
    expect(link).toHaveAttribute('href', '#contacto');
    expect(link).not.toHaveAttribute('target');
  });

  it('opens external links in a new tab safely and says so to screen readers', () => {
    render(
      <PillLink href="https://example.com" variant="ghost" newTabLabel="(se abre en otra pestaña)">
        GitHub
      </PillLink>,
    );
    const link = screen.getByRole('link', { name: 'GitHub (se abre en otra pestaña)' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('ErrorBlock', () => {
  it('announces the error and retries on click', async () => {
    const onRetry = vi.fn();
    render(<ErrorBlock message="No se pudo cargar." retryLabel="Reintentar" onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar.');
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('has no button when there is nothing to retry', () => {
    render(<ErrorBlock message="No existe." />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('ResponsiveImage', () => {
  it('reserves its size and loads lazily by default', () => {
    render(
      <ResponsiveImage
        image={{ url: cloudinary, width: 1920, height: 1080, alt: null }}
        alt="RUCVM"
        sizes="460px"
      />,
    );
    const img = screen.getByRole('img', { name: 'RUCVM' });
    expect(img).toHaveAttribute('width', '1920');
    expect(img).toHaveAttribute('height', '1080');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('sizes', '460px');
    expect(img.getAttribute('srcset')).toContain('w_400');
    expect(img).not.toHaveAttribute('fetchpriority');
  });

  it('loads eagerly with high priority when it is the main image', () => {
    render(
      <ResponsiveImage
        image={{ url: cloudinary, width: 1920, height: 1080, alt: null }}
        alt="Portada"
        sizes="100vw"
        priority
      />,
    );
    const img = screen.getByRole('img', { name: 'Portada' });
    expect(img).toHaveAttribute('loading', 'eager');
    expect(img).toHaveAttribute('fetchpriority', 'high');
  });

  it('omits srcset and sizes for an image that cannot be resized', () => {
    render(
      <ResponsiveImage
        image={{ url: 'https://example.com/a.png', width: 800, height: 600, alt: null }}
        alt="A"
        sizes="100vw"
      />,
    );
    const img = screen.getByRole('img', { name: 'A' });
    expect(img).toHaveAttribute('src', 'https://example.com/a.png');
    expect(img).not.toHaveAttribute('srcset');
    expect(img).not.toHaveAttribute('sizes');
  });
});

describe('SocialIcon', () => {
  it('is hidden from screen readers', () => {
    const { container } = render(<SocialIcon platform="github" />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each(['github', 'linkedin', 'x', 'instagram', 'youtube', 'gitlab', 'GitHub'])(
    'has its own icon for %s',
    (platform) => {
      const { container } = render(<SocialIcon platform={platform} />);
      expect(container.querySelector('svg')).toHaveAttribute('data-icon', platform.toLowerCase());
    },
  );

  it('falls back to a generic icon for an unknown platform', () => {
    const { container } = render(<SocialIcon platform="mastodon" />);
    expect(container.querySelector('svg')).toHaveAttribute('data-icon', 'generic');
  });
});

describe('small blocks', () => {
  it('render their text as text', () => {
    render(
      <>
        <SectionHeading id="proyectos-titulo">Proyectos</SectionHeading>
        <Chip>{'<b>Laravel</b>'}</Chip>
        <EmptyBlock message="Todavía no hay proyectos publicados" />
        <Skeleton />
      </>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Proyectos' })).toHaveAttribute(
      'id',
      'proyectos-titulo',
    );
    expect(screen.getByText('<b>Laravel</b>')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay proyectos publicados')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
  });
});
