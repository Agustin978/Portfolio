import { AppError } from '../../shared/errors/AppError.js';
import type { ExperiencesRepository } from './experiences.repository.js';

// There is deliberately no delete: experiences are only deactivated.
export const createExperiencesService = (repository: ExperiencesRepository) => ({
  async deactivate(id: number) {
    const experience = await repository.findById(id);
    if (!experience) throw new AppError(404, 'EXPERIENCE_NOT_FOUND', 'Experience not found');
    if (experience.deactivatedAt) {
      throw new AppError(
        409,
        'EXPERIENCE_ALREADY_DEACTIVATED',
        'Experience is already deactivated',
      );
    }
    return repository.setDeactivatedAt(id, new Date());
  },

  async reactivate(id: number) {
    const experience = await repository.findById(id);
    if (!experience) throw new AppError(404, 'EXPERIENCE_NOT_FOUND', 'Experience not found');
    if (!experience.deactivatedAt) {
      throw new AppError(409, 'EXPERIENCE_NOT_DEACTIVATED', 'Experience is not deactivated');
    }
    return repository.setDeactivatedAt(id, null);
  },
});

export type ExperiencesService = ReturnType<typeof createExperiencesService>;
