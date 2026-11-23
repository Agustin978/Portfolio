import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiError, hang, ok } from '../helpers/mockApi';
import { categories, mockSite, projects, renderSite } from '../helpers/site';

const filter = () => screen.getByRole('group', { name: 'Filtrar proyectos por categoría' });
const cardTitles = () =>
  screen.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent);

describe('projects section', () => {
  it('shows a card per project with its cover, chips and a uniquely named link', async () => {
    mockSite();
    renderSite('/es');

    const link = await screen.findByRole('link', { name: 'Ver detalle: RUCVM' });
    expect(link).toHaveAttribute('href', '/es/projects/rucvm');
    expect(link).toHaveTextContent('Ver detalle');
    expect(cardTitles()).toEqual([
      'RUCVM',
      'Sistema comercial SaaS',
      'Clasificación de radiografías',
    ]);

    // alt falls back to the title when the API sends null.
    const image = screen.getByRole('img', { name: 'RUCVM' });
    expect(image).toHaveAttribute('loading', 'lazy');
    expect(image.getAttribute('srcset')).toContain('w_800');
  });

  it('filters by category through the URL', async () => {
    mockSite();
    const { router } = renderSite('/es');
    await screen.findByRole('link', { name: 'Ver detalle: RUCVM' });

    const all = within(filter()).getByRole('button', { name: 'Todos' });
    const ai = within(filter()).getByRole('button', { name: 'IA' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(ai).toHaveAttribute('aria-pressed', 'false');

    await userEvent.click(ai);
    expect(router.state.location.search).toBe('?category=ia');
    expect(ai).toHaveAttribute('aria-pressed', 'true');
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(cardTitles()).toEqual(['Clasificación de radiografías']);

    await userEvent.click(all);
    expect(router.state.location.search).toBe('');
    expect(cardTitles()).toHaveLength(3);
  });

  it('starts filtered when the URL has a category', async () => {
    mockSite();
    renderSite('/es?category=web');

    await screen.findByRole('link', { name: 'Ver detalle: RUCVM' });
    await waitFor(() => expect(cardTitles()).toEqual(['RUCVM', 'Sistema comercial SaaS']));
    expect(within(filter()).getByRole('button', { name: 'Web' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('treats an unknown category as "All"', async () => {
    mockSite();
    renderSite('/es?category=nope');

    await screen.findByRole('link', { name: 'Ver detalle: RUCVM' });
    await waitFor(() => expect(filter()).toBeInTheDocument());
    expect(within(filter()).getByRole('button', { name: 'Todos' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(cardTitles()).toHaveLength(3);
  });

  it('has no filter when a single category is in use', async () => {
    mockSite({ projects: projects.slice(0, 2), categories });
    renderSite('/es');

    await screen.findByRole('link', { name: 'Ver detalle: RUCVM' });
    expect(screen.queryByRole('group', { name: 'Filtrar proyectos por categoría' })).toBeNull();
  });

  it('still lists the projects when the categories fail', async () => {
    mockSite().on('GET /project-categories?lang=es', apiError(500, 'INTERNAL_ERROR'));
    renderSite('/es');

    await screen.findByRole('link', { name: 'Ver detalle: RUCVM' });
    expect(cardTitles()).toHaveLength(3);
    expect(screen.queryByRole('group', { name: 'Filtrar proyectos por categoría' })).toBeNull();
  });

  it('says so when nothing is published', async () => {
    mockSite({ projects: [], categories: [] });
    renderSite('/es');

    expect(await screen.findByText('Todavía no hay proyectos publicados.')).toBeVisible();
  });

  it('goes from loading to error to content with "Retry"', async () => {
    mockSite().on('GET /projects?lang=es', hang);
    const view = renderSite('/es');

    const section = await screen.findByRole('region', { name: 'Proyectos' });
    expect(within(section).getByRole('status')).toHaveTextContent('Cargando…');
    expect(within(section).getAllByTestId('skeleton').length).toBeGreaterThan(0);
    view.unmount();

    mockSite().on('GET /projects?lang=es', apiError(500, 'INTERNAL_ERROR'), ok(projects));
    renderSite('/es');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El servidor tuvo un problema.');
    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByRole('link', { name: 'Ver detalle: RUCVM' })).toBeVisible();
  });
});
