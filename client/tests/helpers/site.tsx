import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { Providers } from '../../src/app/Providers';
import { createQueryClient } from '../../src/app/queryClient';
import { routes } from '../../src/app/router';
import type {
  Category,
  Experience,
  ProjectDetail,
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

// One current position without a company link and one finished with it, like the demo seed.
export const experiences: Experience[] = [
  {
    id: 1,
    company: 'Ministerio de Desarrollo Social',
    companyUrl: null,
    location: 'San Miguel de Tucumán',
    role: 'Desarrollador y arquitecto de bases de datos',
    description: 'Primer párrafo del puesto.\n\nSegundo párrafo del puesto.',
    startDate: '2025-05-01',
    endDate: null,
    technologies: [{ slug: 'laravel', name: 'Laravel' }],
    images: [],
  },
  {
    id: 2,
    company: 'Empresa Demo',
    companyUrl: 'https://example.com/empresa',
    location: null,
    role: 'Soporte técnico y redes',
    description: 'Mantenimiento de la red.',
    startDate: '2019-03-01',
    endDate: '2021-12-31',
    technologies: [],
    images: [],
  },
];

// The detail of a project: three images by default (the cover first), no links and no dates.
export function projectDetail(overrides: Partial<ProjectDetail> = {}): ProjectDetail {
  const base = projects[0]!;
  return {
    ...base,
    description: 'Primer párrafo del proyecto.\n\nSegundo párrafo del proyecto.',
    images: [base.cover!, cover('rucvm-2'), cover('rucvm-3')],
    ...overrides,
  };
}

export interface SiteData {
  profile: Profile;
  projects: ProjectSummary[];
  categories: Category[];
  skills: SkillGroup[];
  socialLinks: SocialLink[];
  experiences: Experience[];
}

// Every public request of the home page, answered for one language.
export function mockSite(overrides: Partial<SiteData> = {}, lang = 'es') {
  const data: SiteData = {
    profile,
    projects,
    categories,
    skills,
    socialLinks,
    experiences,
    ...overrides,
  };
  return mockApi()
    .on(`GET /profile?lang=${lang}`, ok(data.profile))
    .on(`GET /projects?lang=${lang}`, ok(data.projects))
    .on(`GET /project-categories?lang=${lang}`, ok(data.categories))
    .on(`GET /experiences?lang=${lang}`, ok(data.experiences))
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
