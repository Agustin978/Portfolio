import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mockSite, renderSite } from '../helpers/site';

// The form's chunk could not be fetched (the connection dropped after the page loaded).
vi.mock('../../src/features/contact/ContactForm', () => {
  throw new TypeError('Failed to fetch dynamically imported module');
});

describe('contact form chunk that fails to load', () => {
  it('says so in the panel, with a retry and the email, and the page keeps working', async () => {
    mockSite();
    renderSite('/es');

    const region = screen.getByRole('region', { name: 'Trabajemos juntos.' });
    const alert = await within(region).findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo conectar con el servidor. Revisá tu conexión.');
    expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeVisible();
    expect(within(alert).getByRole('link', { name: 'hola@example.com' })).toHaveAttribute(
      'href',
      'mailto:hola@example.com',
    );
    expect(await screen.findByRole('heading', { level: 3, name: 'RUCVM' })).toBeVisible();
  });
});
