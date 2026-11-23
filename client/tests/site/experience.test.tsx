import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { apiError, hang, ok } from '../helpers/mockApi';
import { experiences, mockSite, renderSite } from '../helpers/site';

afterEach(async () => {
  await i18n.changeLanguage('es');
});

const section = () => screen.getByRole('region', { name: 'Experiencia' });
const menu = () => screen.getByRole('navigation', { name: 'Principal' });

describe('experience section', () => {
  it('lists the current position first, with "Actualidad" and no company link', async () => {
    mockSite();
    renderSite('/es');

    const current = (
      await screen.findByRole('heading', {
        level: 3,
        name: 'Desarrollador y arquitecto de bases de datos',
      })
    ).closest('li')!;
    expect(within(current).getByText('Actualidad')).toBeVisible();
    const start = current.querySelector('time')!;
    expect(start).toHaveAttribute('datetime', '2025-05-01');
    expect(start).toHaveTextContent('may 2025');
    // Without companyUrl the company is plain text.
    expect(within(current).getByText('Ministerio de Desarrollo Social')).not.toHaveAttribute(
      'href',
    );
    expect(within(current).queryByRole('link')).toBeNull();
    expect(within(current).getByText(/· San Miguel de Tucumán/)).toBeVisible();
    expect(within(current).getByText('Primer párrafo del puesto.')).toBeVisible();
    expect(within(current).getByText('Segundo párrafo del puesto.')).toBeVisible();
    expect(within(current).getByText('Laravel')).toBeVisible();
  });

  it('shows a finished position with both dates and the company as an external link', async () => {
    mockSite();
    renderSite('/es');

    const finished = (
      await screen.findByRole('heading', { level: 3, name: 'Soporte técnico y redes' })
    ).closest('li')!;
    const dates = finished.querySelectorAll('time');
    expect([...dates].map((time) => time.getAttribute('datetime'))).toEqual([
      '2019-03-01',
      '2021-12-31',
    ]);
    expect(within(finished).queryByText('Actualidad')).toBeNull();

    const company = within(finished).getByRole('link', {
      name: 'Empresa Demo (se abre en otra pestaña)',
    });
    expect(company).toHaveAttribute('href', 'https://example.com/empresa');
    expect(company).toHaveAttribute('target', '_blank');
    expect(company).toHaveAttribute('rel', 'noopener noreferrer');
    // No location: no separator either.
    expect(finished).not.toHaveTextContent('·');
    // No technologies: no chip list.
    expect(within(finished).queryByRole('list')).toBeNull();
  });

  it('formats the dates in English on /en', async () => {
    mockSite({}, 'en');
    renderSite('/en');

    const current = (
      await screen.findByRole('heading', {
        level: 3,
        name: 'Desarrollador y arquitecto de bases de datos',
      })
    ).closest('li')!;
    expect(within(current).getByText('Present')).toBeVisible();
    expect(current.querySelector('time')).toHaveTextContent('May 2025');
  });

  it('keeps its menu link in page order, between About me and Contact', async () => {
    mockSite();
    renderSite('/es');
    await screen.findByRole('heading', { level: 3, name: 'Soporte técnico y redes' });

    const link = within(menu()).getByRole('link', { name: 'Experiencia' });
    expect(link).toHaveAttribute('href', '/es#experiencia');
    expect(section()).toHaveAttribute('id', 'experiencia');
  });

  it('hides the section and its menu link when there are no entries', async () => {
    mockSite({ experiences: [] });
    renderSite('/es');

    await screen.findByText('Laravel · Livewire');
    await screen.findByRole('heading', { level: 3, name: 'RUCVM' });
    expect(screen.queryByRole('region', { name: 'Experiencia' })).toBeNull();
    expect(within(menu()).queryByRole('link', { name: 'Experiencia' })).toBeNull();
  });

  it('shows skeleton rows while loading, and the section and link stay', async () => {
    mockSite().on('GET /experiences?lang=es', hang);
    renderSite('/es');

    expect(await within(section()).findByRole('status')).toHaveTextContent('Cargando…');
    expect(within(menu()).getByRole('link', { name: 'Experiencia' })).toBeInTheDocument();
  });

  it('shows its own error with a retry that recovers, without touching other sections', async () => {
    mockSite().on('GET /experiences?lang=es', apiError(500, 'INTERNAL_ERROR'), ok(experiences));
    renderSite('/es');

    const alert = await within(section()).findByRole('alert');
    expect(alert).toHaveTextContent('El servidor tuvo un problema.');
    expect(screen.getByRole('heading', { level: 3, name: 'RUCVM' })).toBeVisible();
    expect(within(menu()).getByRole('link', { name: 'Experiencia' })).toBeInTheDocument();

    await userEvent.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Soporte técnico y redes' }),
    ).toBeVisible();
  });
});
