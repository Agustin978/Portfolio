import { AppError } from '../../shared/errors/AppError.js';
import type {
  SkillGroupValue,
  TechnologiesRepository,
  TechnologyInput,
} from './technologies.repository.js';

// Fixed display order of the groups; the client translates the group labels.
const SKILL_GROUPS: readonly SkillGroupValue[] = ['development', 'data', 'infrastructure', 'other'];

type AdminRow = NonNullable<Awaited<ReturnType<TechnologiesRepository['findById']>>>;

const toAdminTechnology = ({ _count, ...row }: AdminRow) => ({
  ...row,
  projectsCount: _count.projects,
  experiencesCount: _count.experiences,
});

export const createTechnologiesService = (repository: TechnologiesRepository) => ({
  async listSkills() {
    const rows = await repository.findForSkills();
    return SKILL_GROUPS.map((group) => ({
      group,
      technologies: rows
        .filter((row) => row.skillGroup === group)
        .map(({ slug, name }) => ({ slug, name })),
    })).filter(({ technologies }) => technologies.length > 0);
  },

  async list() {
    return (await repository.findAll()).map(toAdminTechnology);
  },

  async get(id: number) {
    const row = await repository.findById(id);
    if (!row) throw new AppError(404, 'TECHNOLOGY_NOT_FOUND', 'Technology not found');
    return toAdminTechnology(row);
  },

  async create(input: TechnologyInput) {
    return toAdminTechnology(await repository.create(input));
  },

  async update(id: number, input: Partial<TechnologyInput>) {
    return toAdminTechnology(await repository.update(id, input));
  },

  async remove(id: number) {
    await repository.remove(id);
  },
});

export type TechnologiesService = ReturnType<typeof createTechnologiesService>;
