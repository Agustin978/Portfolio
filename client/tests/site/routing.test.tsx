import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { ok } from '../helpers/mockApi';
import { mockSite, profile, renderSite } from '../helpers/site';

afterEach(async () => {
  await i18n.changeLanguage('es');
});

describe('routes', () => {
  it.each(['es', 'en'])('sends "/" to the detected language (%s)', async (detected) => {
    await i18n.changeLanguage(detected);
    mockSite({}, detected);
    const { router } = renderSite('/');
    await waitFor(() => expect(router.state.location.pathname).toBe(`/${detected}`));
  });

  it('sends a first segment that is not a language to the detected one', async () => {
    mockSite();
    const { router } = renderSite('/fr/projects/rucvm');
    await waitFor(() => expect(router.state.location.pathname).toBe('/es'));
  });

  it('shows the translated 404 for an unknown path, inside the layout', async () => {
    mockSite({}, 'en');
    renderSite('/en/nothing-here');

    expect(await screen.findByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Back to home' })).toHaveAttribute('href', '/en');
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
  });

  it('has a skip link to the main content', async () => {
    mockSite();
    renderSite('/es');
    const skip = await screen.findByRole('link', { name: 'Saltar al contenido' });
    expect(skip).toHaveAttribute('href', '#contenido');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
  });

  it('titles the page with the name once the profile arrives', async () => {
    mockSite();
    renderSite('/es');
    await waitFor(() => expect(document.title).toBe('Agustín · Portfolio'));
  });
});

describe('language switcher', () => {
  it('links to the same path, query and hash in the other language', async () => {
    mockSite();
    renderSite('/es/nothing?category=web#top');

    const group = await screen.findByRole('group', { name: 'Idioma' });
    const es = within(group).getByRole('link', { name: 'ES' });
    const en = within(group).getByRole('link', { name: 'EN' });

    expect(es).toHaveAttribute('aria-current', 'true');
    expect(es).toHaveAttribute('lang', 'es');
    expect(en).not.toHaveAttribute('aria-current');
    expect(en).toHaveAttribute('lang', 'en');
    expect(en).toHaveAttribute('href', '/en/nothing?category=web#top');
  });

  it('switches the interface and the data to the chosen language', async () => {
    const api = mockSite()
      .on('GET /profile?lang=en', ok({ ...profile, headline: 'I build web systems.' }))
      .on('GET /projects?lang=en', ok([]))
      .on('GET /project-categories?lang=en', ok([]));

    const { router } = renderSite('/es');
    await screen.findByRole('heading', { level: 1, name: /Desarrollo sistemas web/ });

    await userEvent.click(screen.getByRole('link', { name: 'EN' }));

    expect(router.state.location.pathname).toBe('/en');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'I build web systems.' }),
    ).toBeVisible();
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');
    expect(api.calls.map((call) => call.route)).toContain('GET /profile?lang=en');
  });
});
