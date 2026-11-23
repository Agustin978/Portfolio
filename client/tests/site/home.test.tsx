import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { apiError, ok } from '../helpers/mockApi';
import { mockSite, profile, renderSite } from '../helpers/site';

const nav = () => screen.getByRole('navigation', { name: 'Principal' });

describe('home page', () => {
  it('renders every section from the API, in the language of the URL', async () => {
    const api = mockSite();
    renderSite('/es');

    expect(await screen.findByRole('heading', { level: 1, name: profile.headline! })).toBeVisible();
    expect(screen.getByText('Desarrollador · San Miguel de Tucumán, Argentina')).toBeVisible();
    expect(screen.getByText(profile.intro!)).toBeVisible();

    // Header: name as the home link, menu in the page order.
    expect(screen.getByRole('link', { name: 'Agustín' })).toHaveAttribute('href', '/es');
    expect(
      within(nav())
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Proyectos', 'Sobre mí', 'Contacto']);

    // About: bio paragraphs and skills as a definition list.
    expect(await screen.findByText('Primer párrafo de la bio.')).toBeVisible();
    expect(screen.getByText('Segundo párrafo de la bio.')).toBeVisible();
    expect(screen.getByText('Desarrollo', { selector: 'dt' })).toBeVisible();
    expect(screen.getByText('Laravel · Livewire')).toBeVisible();

    // Contact panel and footer.
    expect(screen.getByText(profile.availability!)).toBeVisible();
    expect(screen.getByRole('link', { name: 'hola@example.com' })).toHaveAttribute(
      'href',
      'mailto:hola@example.com',
    );
    const footer = screen.getByRole('contentinfo');
    expect(
      within(footer).getByText(
        `© ${new Date().getFullYear()} Agustín · San Miguel de Tucumán, Argentina`,
      ),
    ).toBeVisible();
    expect(within(footer).getByRole('link', { name: /Volver arriba/ })).toHaveAttribute(
      'href',
      '#inicio',
    );

    const routes = api.calls.map((call) => call.route);
    expect(routes).toEqual(
      expect.arrayContaining([
        'GET /profile?lang=es',
        'GET /projects?lang=es',
        'GET /project-categories?lang=es',
      ]),
    );
  });

  it('links the hero buttons to the sections and keeps the CV link external', async () => {
    mockSite({ profile: { ...profile, cvUrl: 'https://example.com/cv.pdf' } });
    renderSite('/es');

    expect(await screen.findByRole('link', { name: 'Ver proyectos' })).toHaveAttribute(
      'href',
      '/es#proyectos',
    );
    const cv = screen.getByRole('link', { name: 'Descargar CV (se abre en otra pestaña)' });
    expect(cv).toHaveAttribute('href', 'https://example.com/cv.pdf');
    expect(cv).toHaveAttribute('target', '_blank');
    expect(cv).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('hides every optional element whose field is null', async () => {
    mockSite({
      profile: {
        ...profile,
        role: null,
        headline: null,
        intro: null,
        cvUrl: null,
        publicEmail: null,
        availability: null,
      },
    });
    renderSite('/es');

    // Without a headline the name keeps the h1; without a role the eyebrow drops the separator.
    expect(await screen.findByRole('heading', { level: 1, name: 'Agustín' })).toBeVisible();
    // Exact text: no orphan "·" before the location.
    expect(screen.getByText('San Miguel de Tucumán, Argentina')).toBeVisible();
    expect(screen.queryByRole('link', { name: /Descargar CV/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /@/ })).toBeNull();
    // The availability falls back to the i18n text.
    expect(
      screen.getByText(
        'Estoy abierto a oportunidades de desarrollo backend, full stack e infraestructura.',
      ),
    ).toBeVisible();
  });

  it('hides "About me" and its menu link when there is neither bio nor skills', async () => {
    mockSite({ profile: { ...profile, bio: null }, skills: [] });
    renderSite('/es');

    await screen.findByRole('heading', { level: 1 });
    await waitFor(() => expect(within(nav()).queryByRole('link', { name: 'Sobre mí' })).toBeNull());
    expect(screen.queryByRole('heading', { level: 2, name: 'Sobre mí' })).toBeNull();
  });

  it('labels social links, falls back for unknown platforms and drops unsafe URLs', async () => {
    mockSite({
      socialLinks: [
        { platform: 'github', url: 'https://example.com/github' },
        { platform: 'mastodon', url: 'https://example.com/@me' },
        { platform: 'linkedin', url: 'javascript:alert(1)' },
      ],
    });
    renderSite('/es');

    const github = await screen.findByRole('link', { name: 'GitHub (se abre en otra pestaña)' });
    expect(github.querySelector('svg')).toHaveAttribute('data-icon', 'github');
    const mastodon = screen.getByRole('link', { name: 'Mastodon (se abre en otra pestaña)' });
    expect(mastodon.querySelector('svg')).toHaveAttribute('data-icon', 'generic');
    expect(screen.queryByRole('link', { name: /LinkedIn/ })).toBeNull();
  });

  it('keeps the other sections when one fails, and retries the failed one', async () => {
    mockSite().on('GET /skills', apiError(500, 'INTERNAL_ERROR'), ok([]));
    renderSite('/es');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('El servidor tuvo un problema. Probá de nuevo en un momento.');
    expect(screen.getByRole('heading', { level: 1, name: profile.headline! })).toBeVisible();
    expect(screen.getByText('Primer párrafo de la bio.')).toBeVisible();

    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('shows the profile error in the hero and keeps a single h1', async () => {
    mockSite().on('GET /profile?lang=es', apiError(503, 'SERVICE_UNAVAILABLE'));
    renderSite('/es');

    // 503 is retried twice (1 s and 2 s) before the error shows.
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent('El servidor tuvo un problema.');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeInTheDocument();
    // The name link in the header still has an accessible name.
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', '/es');
  }, 10_000);
});
