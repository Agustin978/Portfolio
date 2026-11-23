import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import i18n from '../../src/i18n';
import { ok } from '../helpers/mockApi';
import { mockSite, profile, projectDetail, renderSite } from '../helpers/site';

afterEach(async () => {
  await i18n.changeLanguage('es');
});

// Every control, with the optional ones (CV) present, once the whole page has loaded.
async function renderLoadedHome(lang: 'es' | 'en') {
  mockSite({ profile: { ...profile, cvUrl: 'https://example.com/cv.pdf' } }, lang);
  renderSite(`/${lang}`);
  await screen.findByRole('heading', { level: 1, name: profile.headline! });
  await screen.findByText('Laravel · Livewire');
  await screen.findByRole('link', { name: /GitHub/ });
  await screen.findByRole('group', { name: lang === 'es' ? /categoría/i : /category/i });
}

describe('accessible names on the home page', () => {
  it.each(['es', 'en'] as const)('gives every link and button a name (%s)', async (lang) => {
    await renderLoadedHome(lang);

    expectEveryControlNamed(10);
  });

  it.each(['es', 'en'] as const)(
    'gives every link and button of a project detail a name (%s)',
    async (lang) => {
      mockSite({}, lang).on(
        `GET /projects/rucvm?lang=${lang}`,
        ok(
          projectDetail({
            liveUrl: 'https://example.com/demo',
            repoUrl: 'https://example.com/repo',
            startedAt: '2024-03-01',
          }),
        ),
      );
      renderSite(`/${lang}/projects/rucvm`);
      await screen.findByRole('heading', { level: 1, name: 'RUCVM' });

      // Back link, both external links and three thumbnails, plus the header and footer.
      expectEveryControlNamed(8);
      expect(screen.getAllByRole('button')).toHaveLength(3);
    },
  );

  it('names the language links and the logo, with a matching title', async () => {
    await renderLoadedHome('es');

    const spanish = screen.getByRole('link', { name: 'Español' });
    expect(spanish).toHaveTextContent('ES');
    expect(spanish).toHaveAttribute('title', 'Español');
    expect(spanish).toHaveAttribute('lang', 'es');
    expect(spanish).toHaveAttribute('hreflang', 'es');
    expect(spanish).toHaveAttribute('aria-current', 'true');

    const english = screen.getByRole('link', { name: 'English' });
    expect(english).toHaveTextContent('EN');
    expect(english).toHaveAttribute('title', 'English');
    expect(english).toHaveAttribute('lang', 'en');
    expect(english).toHaveAttribute('hreflang', 'en');
    expect(english).not.toHaveAttribute('aria-current');

    const logo = screen.getByRole('link', { name: 'Agustín, ir al inicio' });
    expect(logo).toHaveAttribute('title', 'Agustín, ir al inicio');
    expect(logo).toHaveAttribute('href', '/es');
  });

  it('keeps title off every other control, so nothing repeats its visible text', async () => {
    await renderLoadedHome('es');

    const titled = [...screen.getAllByRole('link'), ...screen.getAllByRole('button')]
      .filter((control) => control.hasAttribute('title'))
      .map((control) => control.getAttribute('title'));
    expect(titled).toEqual(['Agustín, ir al inicio', 'Español', 'English']);
  });

  it('names the logo in English too', async () => {
    await renderLoadedHome('en');
    expect(screen.getByRole('link', { name: 'Agustín, go to home' })).toHaveAttribute(
      'href',
      '/en',
    );
  });
});

// Every link and button, queried back by role with the name Testing Library computes (what
// assistive tech gets): it must find that very control, with a name that is not blank.
function expectEveryControlNamed(atLeast: number) {
  const controls = [...screen.getAllByRole('link'), ...screen.queryAllByRole('button')];
  expect(controls.length).toBeGreaterThan(atLeast);
  for (const control of controls) {
    expect(control).toHaveAccessibleName(/\S/);
    expect(
      screen.getByRole(roleOf(control), {
        name: (name, element) => element === control && name.trim() !== '',
      }),
    ).toBe(control);
  }
}

function roleOf(element: HTMLElement) {
  return element.tagName === 'BUTTON' ? 'button' : 'link';
}
