import type { Language } from '../i18n/languages';
import { apiClient } from './apiClient';
import type { ProjectDetail, ProjectSummary } from './types';

// The category filter runs in the client over this single list (plan, decision 5.4).
export const getProjects = (lang: Language, signal?: AbortSignal) =>
  apiClient.get<ProjectSummary[]>(`/projects?lang=${lang}`, { signal }).then((body) => body.data);

export const getProject = (slug: string, lang: Language, signal?: AbortSignal) =>
  apiClient
    .get<ProjectDetail>(`/projects/${encodeURIComponent(slug)}?lang=${lang}`, { signal })
    .then((body) => body.data);
