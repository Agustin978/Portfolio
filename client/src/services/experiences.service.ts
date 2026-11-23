import type { Language } from '../i18n/languages';
import { apiClient } from './apiClient';
import type { Experience } from './types';

export const getExperiences = (lang: Language, signal?: AbortSignal) =>
  apiClient.get<Experience[]>(`/experiences?lang=${lang}`, { signal }).then((body) => body.data);
