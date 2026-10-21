import type { SocialLinkInput, SocialLinksRepository } from './social-links.repository.js';

// There is deliberately no remove: a link is hidden with isVisible, never deleted.
export const createSocialLinksService = (repository: SocialLinksRepository) => ({
  listPublic: () => repository.findVisible(),

  list: () => repository.findAll(),

  create: (input: SocialLinkInput) => repository.create(input),

  update: (id: number, input: Partial<SocialLinkInput>) => repository.update(id, input),
});

export type SocialLinksService = ReturnType<typeof createSocialLinksService>;
