import { apiClient } from './apiClient';
import type { SocialLink } from './types';

export const getSocialLinks = (signal?: AbortSignal) =>
  apiClient.get<SocialLink[]>('/social-links', { signal }).then((body) => body.data);
