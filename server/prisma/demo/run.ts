import sharp from 'sharp';
import { createCategoriesRepository } from '../../src/modules/categories/categories.repository.js';
import { createCategoryBody } from '../../src/modules/categories/categories.schemas.js';
import { createCategoriesService } from '../../src/modules/categories/categories.service.js';
import { createExperiencesRepository } from '../../src/modules/experiences/experiences.repository.js';
import { createExperienceBody } from '../../src/modules/experiences/experiences.schemas.js';
import { createExperiencesService } from '../../src/modules/experiences/experiences.service.js';
import { createImagesRepository } from '../../src/modules/images/images.repository.js';
import { uploadImageBody } from '../../src/modules/images/images.schemas.js';
import { createImagesService } from '../../src/modules/images/images.service.js';
import { createProfileRepository } from '../../src/modules/profile/profile.repository.js';
import { updateProfileBody } from '../../src/modules/profile/profile.schemas.js';
import { createProfileService } from '../../src/modules/profile/profile.service.js';
import { createProjectsRepository } from '../../src/modules/projects/projects.repository.js';
import {
  createProjectBody,
  updateProjectBody,
} from '../../src/modules/projects/projects.schemas.js';
import { createProjectsService } from '../../src/modules/projects/projects.service.js';
import { createSocialLinksRepository } from '../../src/modules/social-links/social-links.repository.js';
import { createSocialLinkBody } from '../../src/modules/social-links/social-links.schemas.js';
import { createSocialLinksService } from '../../src/modules/social-links/social-links.service.js';
import { createTechnologiesRepository } from '../../src/modules/technologies/technologies.repository.js';
import { createTechnologyBody } from '../../src/modules/technologies/technologies.schemas.js';
import { createTechnologiesService } from '../../src/modules/technologies/technologies.service.js';
import type { PrismaClient } from '../../src/shared/db/prisma.js';
import type { ImageStorage } from '../../src/shared/storage/imageStorage.js';
import {
  PLACEHOLDER_FULL_NAME,
  demoCategories,
  demoExperiences,
  demoProfile,
  demoProjects,
  demoSocialLinks,
  demoTechnologies,
  type DemoExperience,
  type DemoProject,
} from './content.js';

export type SeedDemoReport = {
  created: string[];
  skipped: string[];
  warnings: string[];
  failed: string[];
};

export type SeedDemoOptions = {
  db: PrismaClient;
  storage: ImageStorage;
  // Without an image host a project cannot get its cover, so it can only be left as a draft.
  storageConfigured: boolean;
};

// Plain colour on purpose: rendering text would depend on the fonts installed on the machine.
const placeholderImage = (color: string) =>
  sharp({ create: { width: 1600, height: 900, channels: 3, background: color } })
    .png()
    .toBuffer();

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

export const imagesLabel = (count: number) => `${count} ${count === 1 ? 'imagen' : 'imágenes'}`;

// Request bodies as the admin API would receive them; exported so the content test parses the
// exact same objects.
export const projectBody = (project: DemoProject, categoryId: number, technologyIds: number[]) => ({
  slug: project.slug,
  categoryId,
  titleEs: project.titleEs,
  titleEn: project.titleEn,
  summaryEs: project.summaryEs,
  summaryEn: project.summaryEn,
  descriptionEs: project.descriptionEs,
  descriptionEn: project.descriptionEn,
  repoUrl: project.repoUrl,
  liveUrl: project.liveUrl,
  isFeatured: project.isFeatured,
  sortOrder: project.sortOrder,
  technologyIds,
});

export const experienceBody = (experience: DemoExperience, technologyIds: number[]) => ({
  company: experience.company,
  companyUrl: experience.companyUrl,
  location: experience.location,
  roleEs: experience.roleEs,
  roleEn: experience.roleEn,
  descriptionEs: experience.descriptionEs,
  descriptionEn: experience.descriptionEn,
  startDate: experience.startDate,
  endDate: experience.endDate,
  status: 'published' as const,
  sortOrder: experience.sortOrder,
  technologyIds,
});

// Everything goes through the same services (and Zod bodies) as the admin API, so the demo data
// obeys the same rules as real data. Nothing that already exists is ever modified.
export async function runSeedDemo({
  db,
  storage,
  storageConfigured,
}: SeedDemoOptions): Promise<SeedDemoReport> {
  const report: SeedDemoReport = { created: [], skipped: [], warnings: [], failed: [] };

  const categories = createCategoriesService(createCategoriesRepository(db));
  const technologies = createTechnologiesService(createTechnologiesRepository(db));
  const projects = createProjectsService(createProjectsRepository(db));
  const experiences = createExperiencesService(createExperiencesRepository(db));
  const socialLinks = createSocialLinksService(createSocialLinksRepository(db));
  const profile = createProfileService(createProfileRepository(db));
  const projectImages = createImagesService({
    repository: createImagesRepository(db),
    storage,
    kind: 'project',
  });

  // Profile: fill only what is empty; the name is replaced only while it is the seed placeholder.
  const currentProfile = await profile.get();
  const profilePatch: Record<string, string> = {};
  for (const [key, value] of Object.entries(demoProfile)) {
    const current = currentProfile[key as keyof typeof demoProfile];
    const isPlaceholder = key === 'fullName' ? current === PLACEHOLDER_FULL_NAME : current === null;
    if (isPlaceholder) profilePatch[key] = value;
  }
  if (Object.keys(profilePatch).length > 0) {
    await profile.update(updateProfileBody.parse(profilePatch));
    report.created.push(`perfil: ${Object.keys(profilePatch).join(', ')}`);
  } else {
    report.skipped.push('perfil: ya tiene datos');
  }

  const categoryIds = new Map<string, number>();
  const existingCategories = await categories.list();
  for (const category of demoCategories) {
    const found = existingCategories.find((row) => row.slug === category.slug);
    if (found) {
      categoryIds.set(category.slug, found.id);
      report.skipped.push(`categoría ${category.slug}`);
      continue;
    }
    const created = await categories.create(createCategoryBody.parse(category));
    categoryIds.set(category.slug, created.id);
    report.created.push(`categoría ${category.slug}`);
  }

  // Matched by name (case-insensitive) or slug, so a technology loaded by hand is reused as is.
  const technologyIds = new Map<string, number>();
  const existingTechnologies = await technologies.list();
  for (const technology of demoTechnologies) {
    const found = existingTechnologies.find(
      (row) =>
        row.name.toLowerCase() === technology.name.toLowerCase() || row.slug === technology.slug,
    );
    if (found) {
      technologyIds.set(technology.slug, found.id);
      report.skipped.push(`tecnología ${technology.name}`);
      continue;
    }
    const created = await technologies.create(createTechnologyBody.parse(technology));
    technologyIds.set(technology.slug, created.id);
    report.created.push(`tecnología ${technology.name}`);
  }

  const idsOf = (slugs: string[]) =>
    slugs.map((slug) => {
      const id = technologyIds.get(slug);
      if (id === undefined) throw new Error(`Demo content references unknown technology ${slug}`);
      return id;
    });

  // Deactivated projects count too: the slug is unique across them.
  const existingProjects = await projects.list({ includeDeactivated: true });
  for (const project of demoProjects) {
    const existing = existingProjects.find((row) => row.slug === project.slug);
    if (!existing) {
      await createProject(project);
    } else if (await isUnfinished(existing)) {
      await recoverProject(project, existing.id);
    } else {
      report.skipped.push(`proyecto ${project.slug}`);
    }
  }

  // The one exception to "never modify": an active draft with no image at all is what a run
  // without Cloudinary or a failed upload leaves behind, so it gets its images and is published.
  // A draft with some images may have been edited by hand, so it is left alone.
  async function isUnfinished(row: (typeof existingProjects)[number]) {
    if (!storageConfigured || row.status !== 'draft' || row.deactivatedAt !== null) return false;
    return (await projects.get(row.id)).images.length === 0;
  }

  async function createProject(project: DemoProject) {
    const categoryId = categoryIds.get(project.categorySlug);
    if (categoryId === undefined) {
      throw new Error(`Demo content references unknown category ${project.categorySlug}`);
    }

    // Created as a draft: publishing needs a cover, which only exists after the first upload.
    const created = await projects.create(
      createProjectBody.parse(projectBody(project, categoryId, idsOf(project.technologySlugs))),
    );

    if (!storageConfigured) {
      report.created.push(`proyecto ${project.slug} (borrador, sin imágenes)`);
      return;
    }
    if (await publishWithImages(project, created.id)) {
      report.created.push(
        `proyecto ${project.slug} (publicado, ${imagesLabel(project.images.length)})`,
      );
    }
  }

  async function recoverProject(project: DemoProject, id: number) {
    if (await publishWithImages(project, id)) {
      report.created.push(
        `proyecto ${project.slug} (recuperado: era borrador sin imágenes; publicado, ${imagesLabel(project.images.length)})`,
      );
    }
  }

  async function publishWithImages(project: DemoProject, id: number) {
    try {
      for (const image of project.images) {
        const alt = uploadImageBody.parse({
          altEs: `Imagen de ejemplo: ${project.titleEs}`,
          altEn: `Placeholder image: ${project.titleEn}`,
        });
        await projectImages.upload(id, await placeholderImage(image.color), alt);
      }
      await projects.update(id, updateProjectBody.parse({ status: 'published' }));
      return true;
    } catch (error) {
      // Left as a draft. A re-run recovers it only if no image got through.
      report.failed.push(`proyecto ${project.slug}: quedó en borrador (${describeError(error)})`);
      return false;
    }
  }

  // Matched by company: experiences have no slug.
  const existingExperiences = await experiences.list({ includeDeactivated: true });
  for (const experience of demoExperiences) {
    if (existingExperiences.some((row) => row.company === experience.company)) {
      report.skipped.push(`experiencia ${experience.company}`);
      continue;
    }
    await experiences.create(
      createExperienceBody.parse(experienceBody(experience, idsOf(experience.technologySlugs))),
    );
    report.created.push(`experiencia ${experience.company}`);
  }

  const existingLinks = await socialLinks.list();
  for (const link of demoSocialLinks) {
    if (existingLinks.some((row) => row.platform === link.platform)) {
      report.skipped.push(`red ${link.platform}`);
      continue;
    }
    await socialLinks.create(createSocialLinkBody.parse(link));
    report.created.push(`red ${link.platform}`);
  }

  if (!storageConfigured) {
    report.warnings.push(
      'Cloudinary no está configurado: los proyectos quedaron en borrador y sin imágenes, así que no se ven en el sitio. ' +
        'Configurá CLOUDINARY_* en .env y volvé a correr el seed: completa los borradores que sigan sin imágenes.',
    );
  }

  return report;
}
