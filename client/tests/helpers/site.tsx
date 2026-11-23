import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Providers } from '../../src/app/Providers';
import { createQueryClient } from '../../src/app/queryClient';
import { routes } from '../../src/app/router';
import type {
  Category,
  Profile,
  ProjectSummary,
  SkillGroup,
  SocialLink,
} from '../../src/services/types';
import { mockApi, ok } from './mockApi';

// Content shaped like the demo seed, in Spanish. Tests override what they need.
export const profile: Profile = {
  fullName: 'Agustín',
  location: 'San Miguel de Tucumán, Argentina',
  publicEmail: 'hola@example.com',
  cvUrl: null,
  role: 'Desarrollador',
  headline: 'Desarrollo sistemas web que se usan todos los días.',
  intro: 'Soy Agustín, ingeniero en informática.',
  bio: 'Primer párrafo de la bio.\n\nSegundo párrafo de la bio.',
  availability: 'Estoy abierto a oportunidades de desarrollo backend.',
};

const cover = (name: string) => ({
  url: `https://res.cloudinary.com/demo/image/upload/v1/portfolio/development/${name}.webp`,
  width: 1600,
  height: 900,
  alt: null,
});

const web: Category = { slug: 'web', name: 'Web' };
const ai: Category = { slug: 'ia', name: 'IA' };

const project = (slug: string, title: string, category: Category): ProjectSummary => ({
  slug,
  title,
  summary: `Resumen de ${title}.`,
  repoUrl: null,
  liveUrl: null,
  startedAt: null,
  endedAt: null,
  isFeatured: false,
  category,
  technologies: [{ slug: 'laravel', name: 'Laravel' }],
  cover: cover(slug),
});

export const projects: ProjectSummary[] = [
  project('rucvm', 'RUCVM', web),
  project('saas', 'Sistema comercial SaaS', web),
  project('radiografias', 'Clasificación de radiografías', ai),
];

export const categories: Category[] = [web, ai];

export const skills: SkillGroup[] = [
  {
    group: 'development',
    technologies: [
      { slug: 'laravel', name: 'Laravel' },
      { slug: 'livewire', name: 'Livewire' },
    ],
  },
  { group: 'data', technologies: [{ slug: 'postgresql', name: 'PostgreSQL' }] },
];

export const socialLinks: SocialLink[] = [
  { platform: 'github', url: 'https://example.com/github' },
  { platform: 'linkedin', url: 'https://example.com/linkedin' },
];

export interface SiteData {
  profile: Profile;
  projects: ProjectSummary[];
  categories: Category[];
  skills: SkillGroup[];
  socialLinks: SocialLink[];
}

// Every public request of the home page, answered for one language.
export function mockSite(overrides: Partial<SiteData> = {}, lang = 'es') {
  const data: SiteData = { profile, projects, categories, skills, socialLinks, ...overrides };
  return mockApi()
    .on(`GET /profile?lang=${lang}`, ok(data.profile))
    .on(`GET /projects?lang=${lang}`, ok(data.projects))
    .on(`GET /project-categories?lang=${lang}`, ok(data.categories))
    .on('GET /skills', ok(data.skills))
    .on('GET /social-links', ok(data.socialLinks));
}

// The real route tree in a memory router, with a fresh query cache per test.
export function renderSite(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const client = createQueryClient();
  const view = render(
    <Providers client={client}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...view, router, client };
}
