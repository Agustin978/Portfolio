import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import type { ProjectDetail } from '../../src/services/types';
import { apiError, hang, ok } from '../helpers/mockApi';
import { mockSite, projectDetail, renderSite } from '../helpers/site';

afterEach(async () => {
  await i18n.changeLanguage('es');
});

const DETAIL = 'GET /projects/rucvm?lang=es';

function renderDetail(project: Partial<ProjectDetail> = {}) {
  const api = mockSite().on(DETAIL, ok(projectDetail(project)));
  const view = renderSite('/es/projects/rucvm');
  return { api, ...view };
}

const title = () => screen.findByRole('heading', { level: 1, name: 'RUCVM' });
const article = () => screen.getByRole('article');
// The menu has a "Proyectos" link too; the back link is the one inside the page.
const backLink = () => within(article()).getByRole('link', { name: 'Proyectos' });

describe('project detail', () => {
  it('shows the project with its category, summary, description and technologies', async () => {
    renderDetail();
    await title();

    expect(within(article()).getByText('Web')).toBeVisible();
    expect(within(article()).getByText('Resumen de RUCVM.')).toBeVisible();
    expect(within(article()).getByText('Primer párrafo del proyecto.')).toBeVisible();
    expect(within(article()).getByText('Segundo párrafo del proyecto.')).toBeVisible();
    const technologies = within(article()).getByRole('list', { name: 'Tecnologías:' });
    expect(within(technologies).getByText('Laravel')).toBeVisible();
    await waitFor(() => expect(document.title).toBe('RUCVM · Agustín · Portfolio'));
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('swaps the main image from the thumbnails (three images)', async () => {
    renderDetail();
    await title();

    const gallery = screen.getByRole('group', { name: 'Imágenes del proyecto' });
    const thumbs = within(gallery).getAllByRole('button');
    expect(thumbs.map((thumb) => thumb.getAttribute('aria-label'))).toEqual([
      'Imagen 1 de 3',
      'Imagen 2 de 3',
      'Imagen 3 de 3',
    ]);
    expect(thumbs[0]).toHaveAttribute('aria-current', 'true');

    // The main image is the page's largest element: eager, high priority, alt from the title.
    const main = screen.getByRole('img', { name: 'RUCVM' });
    expect(main).toHaveAttribute('loading', 'eager');
    expect(main).toHaveAttribute('fetchpriority', 'high');
    expect(main.getAttribute('src')).toContain('/rucvm.webp');

    await userEvent.click(thumbs[1]!);
    expect(thumbs[1]).toHaveAttribute('aria-current', 'true');
    expect(thumbs[0]).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('img', { name: 'RUCVM' }).getAttribute('src')).toContain(
      '/rucvm-2.webp',
    );
  });

  it('has no thumbnails with a single image', async () => {
    renderDetail({ images: [projectDetail().images[0]!] });
    await title();

    expect(screen.getByRole('img', { name: 'RUCVM' })).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Imágenes del proyecto' })).toBeNull();
  });

  it('shows "Ver sitio" and "Ver código" as external links when both exist', async () => {
    renderDetail({
      liveUrl: 'https://example.com/demo',
      repoUrl: 'https://example.com/repo',
    });
    await title();

    const live = screen.getByRole('link', { name: 'Ver sitio (se abre en otra pestaña)' });
    const repo = screen.getByRole('link', { name: 'Ver código (se abre en otra pestaña)' });
    expect(live).toHaveAttribute('href', 'https://example.com/demo');
    expect(repo).toHaveAttribute('href', 'https://example.com/repo');
    for (const link of [live, repo]) {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });

  it('shows only "Ver código" when there is just a repository', async () => {
    renderDetail({ repoUrl: 'https://example.com/repo' });
    await title();

    expect(screen.getByRole('link', { name: /Ver código/ })).toBeVisible();
    expect(screen.queryByRole('link', { name: /Ver sitio/ })).toBeNull();
  });

  it('shows neither link without URLs, nor for an unsafe one', async () => {
    renderDetail({ liveUrl: 'javascript:alert(1)' });
    await title();

    expect(screen.queryByRole('link', { name: /Ver sitio/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /Ver código/ })).toBeNull();
  });

  it.each([
    { startedAt: null, endedAt: null, times: [], present: false },
    { startedAt: '2024-03-01', endedAt: null, times: ['2024-03-01'], present: true },
    {
      startedAt: '2024-03-01',
      endedAt: '2024-11-30',
      times: ['2024-03-01', '2024-11-30'],
      present: false,
    },
    { startedAt: null, endedAt: '2024-11-30', times: ['2024-11-30'], present: false },
  ])(
    'follows the date rule for start $startedAt and end $endedAt',
    async ({ startedAt, endedAt, times, present }) => {
      renderDetail({ startedAt, endedAt });
      await title();

      const shown = [...article().querySelectorAll('time')].map((time) =>
        time.getAttribute('datetime'),
      );
      expect(shown).toEqual(times);
      expect(within(article()).queryByText('Actualidad') !== null).toBe(present);
    },
  );

  it('formats the dates with the month in the language of the URL, in UTC', async () => {
    renderDetail({ startedAt: '2024-03-01', endedAt: null });
    await title();
    expect(article().querySelector('time')).toHaveTextContent('mar 2024');
  });

  it('shows its own 404 for PROJECT_NOT_FOUND', async () => {
    mockSite().on('GET /projects/no-existe?lang=es', apiError(404, 'PROJECT_NOT_FOUND'));
    renderSite('/es/projects/no-existe');

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Página no encontrada' }),
    ).toBeVisible();
    expect(screen.getByText('Este proyecto no existe o ya no está publicado.')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/es');
    await waitFor(() => expect(document.title).toBe('Página no encontrada · Agustín · Portfolio'));
  });

  it('shows a skeleton with a loading status and keeps a single h1', async () => {
    mockSite().on(DETAIL, hang);
    renderSite('/es/projects/rucvm');

    const status = await within(await screen.findByRole('article')).findByRole('status');
    expect(status).toHaveTextContent('Cargando…');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(backLink()).toBeVisible();
  });

  it('shows an error with a retry that recovers', async () => {
    mockSite().on(DETAIL, apiError(500, 'INTERNAL_ERROR'), ok(projectDetail()));
    renderSite('/es/projects/rucvm');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El servidor tuvo un problema.');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);

    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await title()).toBeVisible();
  });

  it('shows the slow-server notice when the project takes more than 4 s', async () => {
    mockSite().on(DETAIL, hang);
    renderSite('/es/projects/rucvm');

    expect(
      await screen.findByText(
        'El servidor está iniciando; puede tardar hasta un minuto.',
        {},
        { timeout: 6000 },
      ),
    ).toBeVisible();
  }, 10_000);

  it('links back to the projects section when opened directly', async () => {
    renderDetail();
    await title();

    expect(backLink()).toHaveAttribute('href', '/es#proyectos');
  });

  it('steps back to the filtered list when it came from a card', async () => {
    mockSite().on(DETAIL, ok(projectDetail()));
    const { router } = renderSite('/es?category=web');

    await userEvent.click(await screen.findByRole('link', { name: 'Ver detalle: RUCVM' }));
    await title();
    expect(router.state.location.pathname).toBe('/es/projects/rucvm');

    await userEvent.click(backLink());
    await waitFor(() => expect(router.state.location.pathname).toBe('/es'));
    expect(router.state.location.search).toBe('?category=web');
  });

  it('keeps the project when switching language', async () => {
    renderDetail();
    await title();
    expect(screen.getByRole('link', { name: 'English' })).toHaveAttribute(
      'href',
      '/en/projects/rucvm',
    );
  });
});
