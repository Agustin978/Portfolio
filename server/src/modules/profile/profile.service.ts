import { AppError } from '../../shared/errors/AppError.js';
import { localized, type Lang } from '../../shared/http/lang.js';
import type { ProfileInput, ProfileRepository } from './profile.repository.js';

const notFound = () =>
  new AppError(404, 'PROFILE_NOT_FOUND', 'Profile not found; run the database seed');

export const createProfileService = (repository: ProfileRepository) => ({
  async getPublic(lang: Lang) {
    const row = await repository.findPublic();
    if (!row) throw notFound();

    return {
      fullName: row.fullName,
      location: row.location,
      publicEmail: row.publicEmail,
      cvUrl: localized(lang, row.cvUrlEs, row.cvUrlEn),
      role: localized(lang, row.roleEs, row.roleEn),
      headline: localized(lang, row.headlineEs, row.headlineEn),
      intro: localized(lang, row.introEs, row.introEn),
      bio: localized(lang, row.bioEs, row.bioEn),
      availability: localized(lang, row.availabilityEs, row.availabilityEn),
    };
  },

  async get() {
    const row = await repository.find();
    if (!row) throw notFound();
    return row;
  },

  update(input: Partial<ProfileInput>) {
    return repository.update(input);
  },
});

export type ProfileService = ReturnType<typeof createProfileService>;
