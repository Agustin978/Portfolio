import { guarded } from '../../shared/db/guarded.js';
import type { PrismaClient } from '../../shared/db/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';

const adminSelect = {
  id: true,
  slug: true,
  name: true,
  skillGroup: true,
  showInSkills: true,
  sortOrder: true,
  _count: { select: { projects: true, experiences: true } },
} as const;

const ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

export type SkillGroupValue = 'development' | 'data' | 'infrastructure' | 'other';

export type TechnologyInput = {
  slug: string;
  name: string;
  skillGroup: SkillGroupValue;
  showInSkills: boolean;
  sortOrder: number;
};

const slugTaken = () =>
  new AppError(409, 'SLUG_TAKEN', 'A technology with this slug already exists', {
    slug: ['already in use'],
  });
const notFound = () => new AppError(404, 'TECHNOLOGY_NOT_FOUND', 'Technology not found');

export const createTechnologiesRepository = (db: PrismaClient) => ({
  findAll: () => db.technology.findMany({ select: adminSelect, orderBy: [...ORDER] }),

  findById: (id: number) => db.technology.findUnique({ where: { id }, select: adminSelect }),

  create: (data: TechnologyInput) =>
    guarded(() => db.technology.create({ data, select: adminSelect }), { P2002: slugTaken }),

  update: (id: number, data: Partial<TechnologyInput>) =>
    guarded(() => db.technology.update({ where: { id }, data, select: adminSelect }), {
      P2002: slugTaken,
      P2025: notFound,
    }),

  // Usage counts include deactivated projects and experiences, matching what the FK protects.
  // They are fetched only after the database refused the delete, to word the message.
  remove: (id: number) =>
    guarded(() => db.technology.delete({ where: { id }, select: { id: true } }), {
      P2003: async () => {
        const [projects, experiences] = await Promise.all([
          db.projectTechnology.count({ where: { technologyId: id } }),
          db.experienceTechnology.count({ where: { technologyId: id } }),
        ]);
        return new AppError(409, 'TECHNOLOGY_IN_USE', 'Technology is in use', {
          projects,
          experiences,
        });
      },
      P2025: notFound,
    }),
});

export type TechnologiesRepository = ReturnType<typeof createTechnologiesRepository>;
