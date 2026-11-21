import type { Language } from '../i18n/languages';
import { apiClient } from './apiClient';
import type { Category } from './types';

export const getCategories = (lang: Language, signal?: AbortSignal) =>
  apiClient
    .get<Category[]>(`/project-categories?lang=${lang}`, { signal })
    .then((body) => body.data);
