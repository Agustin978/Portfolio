import { useMutation, useQuery } from '@tanstack/react-query';
import type { Language } from '../i18n/languages';
import { getCategories } from '../services/categories.service';
import { sendContactMessage } from '../services/contact.service';
import { getExperiences } from '../services/experiences.service';
import { getProfile } from '../services/profile.service';
import { getProject, getProjects } from '../services/projects.service';
import { getSkills } from '../services/skills.service';
import { getSocialLinks } from '../services/socialLinks.service';

// Translated content carries the language in its key, so switching language never shows the
// other language's cached data. The language always comes from the URL, not from i18n state.
export const queryKeys = {
  profile: (lang: Language) => ['profile', lang] as const,
  projects: (lang: Language) => ['projects', lang] as const,
  project: (slug: string, lang: Language) => ['projects', lang, slug] as const,
  categories: (lang: Language) => ['categories', lang] as const,
  experiences: (lang: Language) => ['experiences', lang] as const,
  skills: () => ['skills'] as const,
  socialLinks: () => ['social-links'] as const,
};

export const useProfile = (lang: Language) =>
  useQuery({
    queryKey: queryKeys.profile(lang),
    queryFn: ({ signal }) => getProfile(lang, signal),
  });

export const useProjects = (lang: Language) =>
  useQuery({
    queryKey: queryKeys.projects(lang),
    queryFn: ({ signal }) => getProjects(lang, signal),
  });

export const useProject = (slug: string, lang: Language) =>
  useQuery({
    queryKey: queryKeys.project(slug, lang),
    queryFn: ({ signal }) => getProject(slug, lang, signal),
  });

export const useCategories = (lang: Language) =>
  useQuery({
    queryKey: queryKeys.categories(lang),
    queryFn: ({ signal }) => getCategories(lang, signal),
  });

export const useExperiences = (lang: Language) =>
  useQuery({
    queryKey: queryKeys.experiences(lang),
    queryFn: ({ signal }) => getExperiences(lang, signal),
  });

export const useSkills = () =>
  useQuery({ queryKey: queryKeys.skills(), queryFn: ({ signal }) => getSkills(signal) });

export const useSocialLinks = () =>
  useQuery({ queryKey: queryKeys.socialLinks(), queryFn: ({ signal }) => getSocialLinks(signal) });

export const useSendContactMessage = () => useMutation({ mutationFn: sendContactMessage });
