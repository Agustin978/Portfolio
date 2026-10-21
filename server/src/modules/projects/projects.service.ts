import { AppError } from '../../shared/errors/AppError.js';
import type { ProjectsRepository } from './projects.repository.js';

// There is deliberately no delete: projects are only deactivated, so slugs and history survive.
export const createProjectsService = (repository: ProjectsRepository) => ({
  async deactivate(id: number) {
    const project = await repository.findById(id);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    if (project.deactivatedAt) {
      throw new AppError(409, 'PROJECT_ALREADY_DEACTIVATED', 'Project is already deactivated');
    }
    return repository.setDeactivatedAt(id, new Date());
  },

  async reactivate(id: number) {
    const project = await repository.findById(id);
    if (!project) throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
    if (!project.deactivatedAt) {
      throw new AppError(409, 'PROJECT_NOT_DEACTIVATED', 'Project is not deactivated');
    }
    return repository.setDeactivatedAt(id, null);
  },
});

export type ProjectsService = ReturnType<typeof createProjectsService>;
