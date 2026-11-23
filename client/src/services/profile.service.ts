import type { Language } from '../i18n/languages';
import { apiClient } from './apiClient';
import type { Profile } from './types';

export const getProfile = (lang: Language, signal?: AbortSignal) =>
  apiClient.get<Profile>(`/profile?lang=${lang}`, { signal }).then((body) => body.data);
