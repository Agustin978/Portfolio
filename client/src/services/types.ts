// Shapes of the public API (docs/api.md). Fields the database requires on published content
// (titles, summaries, descriptions, roles, names) are typed as string; everything else optional
// is nullable and the UI hides its element when it is null.

import type { Language } from '../i18n/languages';

export type IsoDate = string; // YYYY-MM-DD

export interface Profile {
  fullName: string;
  location: string | null;
  publicEmail: string | null;
  cvUrl: string | null;
  role: string | null;
  headline: string | null;
  intro: string | null;
  bio: string | null;
  availability: string | null;
}

export interface PublicImage {
  url: string;
  width: number;
  height: number;
  alt: string | null;
}

export interface TechnologyRef {
  slug: string;
  name: string;
}

export interface Category {
  slug: string;
  name: string;
}

export interface ProjectSummary {
  slug: string;
  title: string;
  summary: string;
  repoUrl: string | null;
  liveUrl: string | null;
  startedAt: IsoDate | null;
  endedAt: IsoDate | null;
  isFeatured: boolean;
  category: Category;
  technologies: TechnologyRef[];
  // Never null for a published project in practice; typed as nullable so the UI tolerates it.
  cover: PublicImage | null;
}

export interface ProjectDetail extends ProjectSummary {
  description: string;
  images: PublicImage[];
}

export interface Experience {
  id: number;
  company: string;
  companyUrl: string | null;
  location: string | null;
  role: string;
  description: string;
  startDate: IsoDate;
  endDate: IsoDate | null;
  technologies: TechnologyRef[];
  images: PublicImage[];
}

export const SKILL_GROUPS = ['development', 'data', 'infrastructure', 'other'] as const;
export type SkillGroupName = (typeof SKILL_GROUPS)[number];

export interface SkillGroup {
  group: SkillGroupName;
  technologies: TechnologyRef[];
}

export interface SocialLink {
  platform: string;
  url: string;
}

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
  lang: Language;
  // Honeypot: always sent, empty unless a bot filled it.
  hp_check: string;
}

export interface ContactReceipt {
  received: true;
}
