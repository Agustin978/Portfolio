import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { createAdminRouter, type AdminMount } from './modules/admin/admin.routes.js';
import { createAuthController } from './modules/auth/auth.controller.js';
import { createRequireAuth } from './modules/auth/auth.middleware.js';
import { createAuthRepository } from './modules/auth/auth.repository.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createCategoriesController } from './modules/categories/categories.controller.js';
import { createCategoriesRepository } from './modules/categories/categories.repository.js';
import {
  createCategoriesAdminRouter,
  createCategoriesPublicRouter,
} from './modules/categories/categories.routes.js';
import { createCategoriesService } from './modules/categories/categories.service.js';
import { createProfileController } from './modules/profile/profile.controller.js';
import { createProfileRepository } from './modules/profile/profile.repository.js';
import {
  createProfileAdminRouter,
  createProfilePublicRouter,
} from './modules/profile/profile.routes.js';
import { createProfileService } from './modules/profile/profile.service.js';
import { createProjectsController } from './modules/projects/projects.controller.js';
import { createProjectsRepository } from './modules/projects/projects.repository.js';
import {
  createProjectsAdminRouter,
  createProjectsPublicRouter,
} from './modules/projects/projects.routes.js';
import { createProjectsService } from './modules/projects/projects.service.js';
import { createSocialLinksController } from './modules/social-links/social-links.controller.js';
import { createSocialLinksRepository } from './modules/social-links/social-links.repository.js';
import {
  createSocialLinksAdminRouter,
  createSocialLinksPublicRouter,
} from './modules/social-links/social-links.routes.js';
import { createSocialLinksService } from './modules/social-links/social-links.service.js';
import { createTechnologiesController } from './modules/technologies/technologies.controller.js';
import { createTechnologiesRepository } from './modules/technologies/technologies.repository.js';
import {
  createSkillsPublicRouter,
  createTechnologiesAdminRouter,
} from './modules/technologies/technologies.routes.js';
import { createTechnologiesService } from './modules/technologies/technologies.service.js';
import { createExperiencesController } from './modules/experiences/experiences.controller.js';
import { createExperiencesRepository } from './modules/experiences/experiences.repository.js';
import {
  createExperiencesAdminRouter,
  createExperiencesPublicRouter,
} from './modules/experiences/experiences.routes.js';
import { createExperiencesService } from './modules/experiences/experiences.service.js';
import { healthRouter } from './modules/health/health.routes.js';
import { getPrisma } from './shared/db/index.js';
import { errorHandler, notFoundHandler } from './shared/middlewares/errorHandler.js';
import { noStore } from './shared/middlewares/noStore.js';
import { createOriginGuard } from './shared/middlewares/originGuard.js';
import { createRateLimiter } from './shared/middlewares/rateLimit.js';

export const app = express();

const authService = createAuthService(createAuthRepository(getPrisma()), {
  jwtSecret: env.JWT_SECRET,
  expiresInSeconds: env.JWT_EXPIRES_IN_SECONDS,
});

// Exactly one proxy hop (Render's load balancer) is trusted. `true` would trust any
// X-Forwarded-For value and let a client dodge the per-IP rate limit by spoofing it.
app.set('trust proxy', 1);

app.use(helmet());
// Credentials are required for the httpOnly auth cookie added in Phase 2.
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(createOriginGuard(env.CLIENT_ORIGIN));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

const requireAuth = createRequireAuth(authService);

const categoriesController = createCategoriesController(
  createCategoriesService(createCategoriesRepository(getPrisma())),
);
const technologiesController = createTechnologiesController(
  createTechnologiesService(createTechnologiesRepository(getPrisma())),
);
const profileController = createProfileController(
  createProfileService(createProfileRepository(getPrisma())),
);
const socialLinksController = createSocialLinksController(
  createSocialLinksService(createSocialLinksRepository(getPrisma())),
);
const projectsController = createProjectsController(
  createProjectsService(createProjectsRepository(getPrisma())),
);
const experiencesController = createExperiencesController(
  createExperiencesService(createExperiencesRepository(getPrisma())),
);

// Every private content module is registered here; createAdminRouter guards the whole group.
export const adminMounts: AdminMount[] = [
  { path: '/project-categories', router: createCategoriesAdminRouter(categoriesController) },
  { path: '/experiences', router: createExperiencesAdminRouter(experiencesController) },
  { path: '/profile', router: createProfileAdminRouter(profileController) },
  { path: '/projects', router: createProjectsAdminRouter(projectsController) },
  { path: '/social-links', router: createSocialLinksAdminRouter(socialLinksController) },
  { path: '/technologies', router: createTechnologiesAdminRouter(technologiesController) },
];

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/experiences', createExperiencesPublicRouter(experiencesController));
app.use('/api/v1/profile', createProfilePublicRouter(profileController));
app.use('/api/v1/skills', createSkillsPublicRouter(technologiesController));
app.use('/api/v1/social-links', createSocialLinksPublicRouter(socialLinksController));
app.use('/api/v1/projects', createProjectsPublicRouter(projectsController));
app.use('/api/v1/project-categories', createCategoriesPublicRouter(categoriesController));
app.use(
  '/api/v1/auth',
  noStore,
  createAuthRouter({
    controller: createAuthController(authService),
    requireAuth,
    loginRateLimiter: createRateLimiter({
      limit: 5,
      windowMs: 15 * 60 * 1000,
      skipSuccessfulRequests: true,
    }),
  }),
);
app.use('/api/v1/admin', createAdminRouter(requireAuth, adminMounts));

app.use(notFoundHandler);
app.use(errorHandler);
