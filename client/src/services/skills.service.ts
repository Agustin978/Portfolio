import { apiClient } from './apiClient';
import type { SkillGroup } from './types';

// Technology names are not translated, so there is no ?lang; the client translates group names.
export const getSkills = (signal?: AbortSignal) =>
  apiClient.get<SkillGroup[]>('/skills', { signal }).then((body) => body.data);
