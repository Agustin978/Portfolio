import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../src/i18n';
import { apiError, hang, networkError, ok } from '../helpers/mockApi';
import { mockSite, profile, renderSite } from '../helpers/site';

afterEach(async () => {
  vi.useRealTimers();
  await i18n.changeLanguage('es');
});

const POST = 'POST /contact';
const received = () => ok({ received: true }, {}, 201);

const section = () =>
  screen.getByRole('region', {
    name: i18n.language === 'en' ? "Let's work together." : 'Trabajemos juntos.',
  });
const field = (name: string) => within(section()).getByLabelText(name);
const submitButton = () => within(section()).getByRole('button', { name: 'Enviar mensaje' });

// Fake data only: the real API is never called and nothing is sent by email.
async function fillForm(user = userEvent.setup()) {
  await user.type(field('Nombre'), '  Ana Pérez ');
  await user.type(field('Email'), 'ana@example.com');
  await user.type(field('Mensaje'), 'Hola, me gustaría hablar de un proyecto.');
  return user;
}

// The form is lazy-loaded: wait for its first field before using it.
async function renderContact({ lang = 'es', publicEmail = profile.publicEmail } = {}) {
  const api = mockSite({ profile: { ...profile, publicEmail } }, lang);
  const view = renderSite(`/${lang}`);
  await screen.findByLabelText(lang === 'en' ? 'Name' : 'Nombre', {}, { timeout: 5000 });
  return { api, ...view };
}

const posts = (api: ReturnType<typeof mockSite>) =>
  api.calls.filter((call) => call.method === 'POST');

describe('contact form', () => {
  it('labels every field and keeps the honeypot out of reach', async () => {
    await renderContact();
    await screen.findByRole('link', { name: 'hola@example.com' });

    for (const label of ['Nombre', 'Email', 'Mensaje']) {
      expect(field(label)).toHaveAttribute('aria-required', 'true');
      expect(field(label)).toHaveAttribute('aria-invalid', 'false');
    }
    expect(field('Email')).toHaveAttribute('type', 'email');
    expect(field('Mensaje').tagName).toBe('TEXTAREA');
    expect(within(section()).getByText('0/5000')).toBeVisible();

    // The exact markup of docs/api.md: no label, no hidden type, no display:none.
    const trap = document.querySelector<HTMLInputElement>('input[name="hp_check"]')!;
    expect(trap).toHaveAttribute('type', 'text');
    expect(trap).toHaveAttribute('autocomplete', 'off');
    expect(trap).toHaveAttribute('tabindex', '-1');
    expect(trap).toHaveAttribute('aria-hidden', 'true');
    expect(trap.parentElement).toHaveAttribute('aria-hidden', 'true');
    expect(trap.parentElement!.className).toContain('-left-[10000px]');
    expect(trap.parentElement!.style.display).not.toBe('none');
    expect(within(section()).queryByRole('textbox', { name: '' })).toBeNull();
  });

  it('validates a field when it loses focus, and links the error to it', async () => {
    await renderContact();
    const user = userEvent.setup();

    await user.click(field('Nombre'));
    await user.tab();

    const name = field('Nombre');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(name).toHaveAccessibleDescription('Este campo es obligatorio.');
    // The message field is described by its counter, and also by its error once there is one.
    expect(field('Mensaje')).toHaveAccessibleDescription('0/5000');

    await user.type(field('Mensaje'), 'Corto');
    await user.tab();
    expect(field('Mensaje')).toHaveAccessibleDescription(
      'El mensaje tiene que tener al menos 10 caracteres. 5/5000',
    );

    // After the first blur it re-validates while typing.
    await user.type(name, 'Ana');
    expect(name).toHaveAttribute('aria-invalid', 'false');
    expect(name).not.toHaveAccessibleDescription();
  });

  it('does not send an invalid form and focuses the first error', async () => {
    const { api } = await renderContact();
    const user = userEvent.setup();
    await user.type(field('Email'), 'no-es-un-email');

    await user.click(submitButton());

    expect(field('Nombre')).toHaveFocus();
    expect(field('Nombre')).toHaveAccessibleDescription('Este campo es obligatorio.');
    expect(field('Email')).toHaveAccessibleDescription('Ingresá un email válido.');
    expect(field('Mensaje')).toHaveAccessibleDescription('Este campo es obligatorio. 0/5000');
    expect(posts(api)).toHaveLength(0);
  });

  it('sends the trimmed values with the language of the URL, once, and confirms', async () => {
    let answer!: () => void;
    const { api } = await renderContact();
    api.on(
      POST,
      () =>
        new Promise<Response>((resolve) => {
          answer = () => resolve(received());
        }),
    );
    const user = await fillForm();

    await user.click(submitButton());
    const sendingButton = within(section()).getByRole('button', { name: 'Enviando…' });
    expect(sendingButton).toHaveAttribute('aria-disabled', 'true');
    // A second click and Enter while it is sending do not send it again.
    await user.click(sendingButton);
    await user.type(field('Email'), '{Enter}');
    expect(posts(api)).toHaveLength(1);
    expect(posts(api)[0]!.body).toEqual({
      name: 'Ana Pérez',
      email: 'ana@example.com',
      message: 'Hola, me gustaría hablar de un proyecto.',
      lang: 'es',
      hp_check: '',
    });

    act(() => answer());

    const heading = await screen.findByRole('heading', { level: 3, name: 'Recibí tu mensaje.' });
    expect(heading).toHaveFocus();
    expect(heading.closest('[role="status"]')).toHaveTextContent('Gracias por escribir.');
    expect(within(section()).queryByLabelText('Nombre')).toBeNull();

    await user.click(within(section()).getByRole('button', { name: 'Enviar otro mensaje' }));
    expect(field('Nombre')).toHaveValue('');
    expect(field('Mensaje')).toHaveValue('');
    expect(field('Nombre')).toHaveFocus();
    expect(posts(api)).toHaveLength(1);
  });

  it('sends lang "en" and speaks English on /en', async () => {
    const { api } = await renderContact({ lang: 'en' });
    api.on(POST, received());
    const user = userEvent.setup();
    await user.type(field('Name'), 'Ana');
    await user.type(field('Email'), 'ana@example.com');
    await user.type(field('Message'), 'Hello, about a project.');

    await user.click(within(section()).getByRole('button', { name: 'Send message' }));

    expect(
      await screen.findByRole('heading', { level: 3, name: 'I got your message.' }),
    ).toHaveFocus();
    expect(posts(api)[0]!.body).toMatchObject({ lang: 'en' });
  });

  it('keeps what was typed and offers a retry and the email after a network failure', async () => {
    const { api } = await renderContact();
    api.on(POST, networkError(), received());
    const user = await fillForm();

    await user.click(submitButton());

    const alert = await within(section()).findByRole('alert');
    expect(alert).toHaveTextContent('No se pudo conectar con el servidor. Revisá tu conexión.');
    expect(alert).toHaveTextContent('Si el problema sigue, escribime a hola@example.com');
    expect(within(alert).getByRole('link', { name: 'hola@example.com' })).toHaveAttribute(
      'href',
      'mailto:hola@example.com',
    );
    expect(field('Nombre')).toHaveValue('  Ana Pérez ');
    expect(field('Mensaje')).toHaveValue('Hola, me gustaría hablar de un proyecto.');

    // A POST is never retried on its own.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(posts(api)).toHaveLength(1);

    await user.click(within(alert).getByRole('button', { name: 'Reintentar' }));
    expect(
      await screen.findByRole('heading', { level: 3, name: 'Recibí tu mensaje.' }),
    ).toBeVisible();
    expect(posts(api)).toHaveLength(2);
  });

  it('offers the retry without the email line when there is no publicEmail', async () => {
    const { api } = await renderContact({ publicEmail: null });
    api.on(POST, apiError(503, 'SERVICE_UNAVAILABLE'));
    const user = await fillForm();

    await user.click(submitButton());

    const alert = await within(section()).findByRole('alert');
    expect(alert).toHaveTextContent('El servidor tuvo un problema. Probá de nuevo en un momento.');
    expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeVisible();
    expect(alert).not.toHaveTextContent('escribime');
    expect(within(alert).queryByRole('link')).toBeNull();
  });

  it('shows the timeout with a retry', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { api } = await renderContact();
    api.on(POST, hang);
    const user = await fillForm(userEvent.setup({ advanceTimers: vi.advanceTimersByTime }));

    await user.click(submitButton());
    await act(() => vi.advanceTimersByTimeAsync(60_000));

    const alert = await within(section()).findByRole('alert');
    expect(alert).toHaveTextContent('El servidor tardó demasiado en responder.');
    expect(within(alert).getByRole('button', { name: 'Reintentar' })).toBeVisible();
    expect(within(alert).getByRole('link', { name: 'hola@example.com' })).toBeVisible();
    expect(field('Email')).toHaveValue('ana@example.com');
  });

  it('shows a generic notice on 429, without retry or countdown', async () => {
    const { api } = await renderContact();
    api.on(POST, apiError(429, 'RATE_LIMITED'));
    const user = await fillForm();

    await user.click(submitButton());

    const alert = await within(section()).findByRole('alert');
    expect(alert).toHaveTextContent(
      'Se enviaron demasiados mensajes desde esta conexión. Probá de nuevo más tarde.',
    );
    expect(within(alert).queryByRole('button')).toBeNull();
    expect(within(alert).queryByRole('link')).toBeNull();
    expect(field('Mensaje')).toHaveValue('Hola, me gustaría hablar de un proyecto.');
    // The submit button is back, so the person can try again later.
    expect(submitButton()).toHaveAttribute('aria-disabled', 'false');
  });

  it('marks the fields the server rejects with a 400', async () => {
    const { api } = await renderContact();
    api.on(POST, apiError(400, 'VALIDATION_ERROR', { email: ['Invalid email address'] }));
    const user = await fillForm();

    await user.click(submitButton());

    const alert = await within(section()).findByRole('alert');
    expect(alert).toHaveTextContent('Revisá los datos e intentá de nuevo.');
    expect(within(alert).queryByRole('button')).toBeNull();
    await waitFor(() => expect(field('Email')).toHaveFocus());
    expect(field('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(field('Email')).toHaveAccessibleDescription('Ingresá un email válido.');
    // The server's message is never shown.
    expect(section()).not.toHaveTextContent('Invalid email address');
  });

  it('counts the characters of the message', async () => {
    await renderContact();
    await userEvent.type(field('Mensaje'), 'Doce letras.');
    expect(within(section()).getByText('12/5000')).toBeVisible();
  });

  it('draws the error box with the error color, like the field errors', async () => {
    const { api } = await renderContact();
    api.on(POST, apiError(429, 'RATE_LIMITED'));
    const user = await fillForm();
    await user.click(submitButton());

    const alert = await within(section()).findByRole('alert');
    expect(alert).toHaveClass('border-danger-on-dark');
    expect(alert).not.toHaveClass('border-border-field');
  });
});
