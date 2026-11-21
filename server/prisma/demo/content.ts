// Development-only demo content for `npm run db:seed-demo`. Reviewed and approved by the owner
// before it was written; real content is loaded later through the API or the admin panel.
// Every URL lives under example.com: the demo must never point at someone's real account.

export type DemoCategory = { slug: string; nameEs: string; nameEn: string; sortOrder: number };

export type DemoTechnology = {
  slug: string;
  name: string;
  skillGroup: 'development' | 'data' | 'infrastructure' | 'other';
  showInSkills: boolean;
  sortOrder: number;
};

export type DemoImage = { color: string };

export type DemoProject = {
  slug: string;
  categorySlug: string;
  titleEs: string;
  titleEn: string;
  summaryEs: string;
  summaryEn: string;
  descriptionEs: string;
  descriptionEn: string;
  repoUrl: string | null;
  liveUrl: string | null;
  isFeatured: boolean;
  sortOrder: number;
  technologySlugs: string[];
  // The first image becomes the cover; more than one exercises the gallery of the detail page.
  images: DemoImage[];
};

export type DemoExperience = {
  company: string;
  companyUrl: string | null;
  location: string | null;
  roleEs: string;
  roleEn: string;
  descriptionEs: string;
  descriptionEn: string;
  startDate: string;
  endDate: string | null;
  sortOrder: number;
  technologySlugs: string[];
};

export type DemoSocialLink = { platform: string; url: string; sortOrder: number };

// The value the base seed writes; only this placeholder name is replaced.
export const PLACEHOLDER_FULL_NAME = 'Nombre Apellido';

export const demoProfile = {
  fullName: 'Agustín',
  location: 'San Miguel de Tucumán, Argentina',
  publicEmail: 'demo@example.com',
  roleEs: 'Desarrollador Full Stack',
  roleEn: 'Full Stack Developer',
  headlineEs: 'Desarrollo sistemas web que se usan todos los días.',
  headlineEn: 'I build web systems people use every day.',
  introEs:
    'Soy Agustín, ingeniero en informática. Trabajo con Laravel, Livewire y PostgreSQL, y tengo experiencia en redes e infraestructura.',
  introEn:
    "I'm Agustín, a computer engineer. I work with Laravel, Livewire and PostgreSQL, and I have experience in networking and infrastructure.",
  bioEs:
    'Soy ingeniero en informática por la Universidad Nacional de Tucumán. Trabajo como desarrollador, analista y arquitecto de bases de datos en el Ministerio de Desarrollo Social de Tucumán.\n\n' +
    'Además del desarrollo, tengo experiencia en infraestructura de redes y administración de Windows Server. Me formé en el bootcamp Full Stack (MERN) de Rolling Code School.',
  bioEn:
    "I'm a computer engineer from the Universidad Nacional de Tucumán. I work as a developer, analyst and database architect at the Ministry of Social Development of Tucumán.\n\n" +
    'Besides development, I have experience in network infrastructure and Windows Server administration. I trained in the Full Stack (MERN) bootcamp at Rolling Code School.',
  availabilityEs:
    'Estoy abierto a oportunidades de desarrollo backend, full stack e infraestructura.',
  availabilityEn: "I'm open to backend, full stack and infrastructure roles.",
};

export const demoCategories: DemoCategory[] = [
  { slug: 'web', nameEs: 'Web', nameEn: 'Web', sortOrder: 0 },
  { slug: 'ia', nameEs: 'IA', nameEn: 'AI', sortOrder: 1 },
  { slug: 'redes', nameEs: 'Redes', nameEn: 'Networking', sortOrder: 2 },
];

// Technology names have a single column, so they must read the same in both languages.
export const demoTechnologies: DemoTechnology[] = [
  { slug: 'laravel', name: 'Laravel', skillGroup: 'development', showInSkills: true, sortOrder: 0 },
  {
    slug: 'livewire',
    name: 'Livewire',
    skillGroup: 'development',
    showInSkills: true,
    sortOrder: 1,
  },
  {
    slug: 'alpinejs',
    name: 'Alpine.js',
    skillGroup: 'development',
    showInSkills: true,
    sortOrder: 2,
  },
  {
    slug: 'tailwindcss',
    name: 'Tailwind CSS',
    skillGroup: 'development',
    showInSkills: true,
    sortOrder: 3,
  },
  { slug: 'flux-ui', name: 'Flux UI', skillGroup: 'development', showInSkills: true, sortOrder: 4 },
  { slug: 'nodejs', name: 'Node.js', skillGroup: 'development', showInSkills: true, sortOrder: 5 },
  {
    slug: 'typescript',
    name: 'TypeScript',
    skillGroup: 'development',
    showInSkills: true,
    sortOrder: 6,
  },
  { slug: 'postgresql', name: 'PostgreSQL', skillGroup: 'data', showInSkills: true, sortOrder: 10 },
  { slug: 'sql', name: 'SQL', skillGroup: 'data', showInSkills: true, sortOrder: 11 },
  {
    slug: 'deep-learning',
    name: 'Deep Learning',
    skillGroup: 'data',
    showInSkills: false,
    sortOrder: 12,
  },
  {
    slug: 'densenet-121',
    name: 'DenseNet-121',
    skillGroup: 'data',
    showInSkills: false,
    sortOrder: 13,
  },
  {
    slug: 'nih-chest-x-ray',
    name: 'NIH Chest X-ray',
    skillGroup: 'data',
    showInSkills: false,
    sortOrder: 14,
  },
  {
    slug: 'networking',
    name: 'Networking',
    skillGroup: 'infrastructure',
    showInSkills: true,
    sortOrder: 20,
  },
  {
    slug: 'windows-server',
    name: 'Windows Server',
    skillGroup: 'infrastructure',
    showInSkills: true,
    sortOrder: 21,
  },
  {
    slug: 'gitlab-ci-cd',
    name: 'GitLab CI/CD',
    skillGroup: 'infrastructure',
    showInSkills: true,
    sortOrder: 22,
  },
  {
    slug: 'cisco-packet-tracer',
    name: 'Cisco Packet Tracer',
    skillGroup: 'infrastructure',
    showInSkills: false,
    sortOrder: 23,
  },
  { slug: 'vlan', name: 'VLAN', skillGroup: 'infrastructure', showInSkills: false, sortOrder: 24 },
  {
    slug: 'routing',
    name: 'Routing',
    skillGroup: 'infrastructure',
    showInSkills: false,
    sortOrder: 25,
  },
];

// Dates are left null on purpose (owner's decision): the real ones are loaded later.
export const demoProjects: DemoProject[] = [
  {
    slug: 'rucvm',
    categorySlug: 'web',
    titleEs: 'RUCVM',
    titleEn: 'RUCVM',
    summaryEs:
      'Sistema de gestión de casos del Ministerio de Desarrollo Social de Tucumán: fichas sociales, seguimiento de intervenciones y reportes estadísticos.',
    summaryEn:
      'Case management system for the Ministry of Social Development of Tucumán: social records, intervention tracking and statistical reports.',
    descriptionEs:
      'Sistema interno que centraliza los casos atendidos por el Ministerio. Cada ficha reúne los datos de la persona, las intervenciones realizadas y su seguimiento.\n\n' +
      'Incluye reportes estadísticos para la toma de decisiones y se despliega con GitLab CI/CD.',
    descriptionEn:
      "Internal system that centralizes the cases handled by the Ministry. Each record gathers the person's data, the interventions carried out and their follow-up.\n\n" +
      'It includes statistical reports for decision-making and is deployed with GitLab CI/CD.',
    repoUrl: null,
    liveUrl: null,
    isFeatured: true,
    sortOrder: 0,
    technologySlugs: [
      'laravel',
      'livewire',
      'flux-ui',
      'tailwindcss',
      'postgresql',
      'gitlab-ci-cd',
    ],
    images: [{ color: '#0F766E' }, { color: '#115E59' }, { color: '#134E4A' }],
  },
  {
    slug: 'sistema-comercial-saas',
    categorySlug: 'web',
    titleEs: 'Sistema comercial SaaS',
    titleEn: 'SaaS commercial system',
    summaryEs:
      'Sistema comercial con arquitectura modular, desarrollado por fases. Proyecto personal en construcción.',
    summaryEn:
      'Commercial system with a modular architecture, built in phases. Personal project in progress.',
    descriptionEs:
      'Proyecto personal para practicar una arquitectura modular en Laravel 12: cada módulo se agrega en una fase propia, con sus pruebas.',
    descriptionEn:
      'Personal project to practice a modular architecture in Laravel 12: each module is added in its own phase, with its tests.',
    repoUrl: 'https://example.com/repo/sistema-comercial-saas',
    liveUrl: 'https://example.com/demo/sistema-comercial-saas',
    isFeatured: false,
    sortOrder: 1,
    technologySlugs: ['laravel', 'livewire', 'alpinejs', 'tailwindcss', 'flux-ui'],
    images: [{ color: '#1D4ED8' }],
  },
  {
    slug: 'clasificacion-radiografias-torax',
    categorySlug: 'ia',
    titleEs: 'Clasificación de radiografías de tórax',
    titleEn: 'Chest X-ray classification',
    summaryEs:
      'Proyecto final de la carrera: modelo híbrido de Deep Learning para clasificar 14 patologías en radiografías con validación anti-leakage propia, priorizando la sensibilidad clínica.',
    summaryEn:
      'Final degree project: a hybrid Deep Learning model that classifies 14 pathologies in X-rays with its own anti-leakage validation, prioritizing clinical sensitivity.',
    descriptionEs:
      'Modelo basado en DenseNet-121 entrenado con el conjunto NIH Chest X-ray, con validación anti-leakage propia. El objetivo fue reducir los falsos negativos, que en un contexto clínico son el error más costoso.',
    descriptionEn:
      'A DenseNet-121 based model trained on the NIH Chest X-ray dataset, with its own anti-leakage validation. The goal was to reduce false negatives, the costliest error in a clinical setting.',
    repoUrl: 'https://example.com/repo/clasificacion-radiografias-torax',
    liveUrl: null,
    isFeatured: false,
    sortOrder: 2,
    technologySlugs: ['deep-learning', 'densenet-121', 'nih-chest-x-ray'],
    images: [{ color: '#6D28D9' }],
  },
  {
    slug: 'laboratorios-de-redes',
    categorySlug: 'redes',
    titleEs: 'Laboratorios de redes',
    titleEn: 'Networking labs',
    summaryEs:
      'Topologías armadas en Cisco Packet Tracer: VLANs, enrutamiento entre sedes y control de acceso.',
    summaryEn:
      'Topologies built in Cisco Packet Tracer: VLANs, routing between sites and access control.',
    descriptionEs:
      'Serie de laboratorios que simulan la red de una organización con varias sedes: segmentación con VLANs, enrutamiento entre ellas y listas de control de acceso.',
    descriptionEn:
      'A series of labs simulating the network of a multi-site organization: VLAN segmentation, routing between sites and access control lists.',
    repoUrl: null,
    liveUrl: null,
    isFeatured: false,
    sortOrder: 3,
    technologySlugs: ['cisco-packet-tracer', 'vlan', 'routing'],
    images: [{ color: '#B45309' }],
  },
];

export const demoExperiences: DemoExperience[] = [
  {
    company: 'Ministerio de Desarrollo Social de Tucumán',
    companyUrl: null,
    location: 'San Miguel de Tucumán',
    roleEs: 'Desarrollador, analista y arquitecto de bases de datos',
    roleEn: 'Developer, analyst and database architect',
    descriptionEs:
      'Desarrollo de sistemas de gestión de programas sociales con PHP, Laravel y Livewire. Diseño y optimización de bases de datos PostgreSQL y despliegue con CI/CD en GitLab.',
    descriptionEn:
      'Development of social program management systems with PHP, Laravel and Livewire. PostgreSQL database design and optimization, and deployment with GitLab CI/CD.',
    startDate: '2025-05-01',
    endDate: null,
    sortOrder: 0,
    technologySlugs: ['laravel', 'livewire', 'postgresql', 'gitlab-ci-cd', 'sql'],
  },
  {
    company: 'Empresa Demo (ficticia)',
    companyUrl: 'https://example.com',
    location: 'San Miguel de Tucumán',
    roleEs: 'Soporte técnico y redes (ficticio)',
    roleEn: 'IT support and networking (fictional)',
    descriptionEs:
      'Experiencia ficticia para probar el orden y la lista. Borrala o desactivala cuando cargues datos reales.',
    descriptionEn:
      'Fictional entry to test ordering and the list. Remove or deactivate it once real data is loaded.',
    startDate: '2019-03-01',
    endDate: '2021-12-31',
    sortOrder: 1,
    technologySlugs: ['networking', 'windows-server'],
  },
];

export const demoSocialLinks: DemoSocialLink[] = [
  { platform: 'github', url: 'https://example.com/github', sortOrder: 0 },
  { platform: 'linkedin', url: 'https://example.com/linkedin', sortOrder: 1 },
];
