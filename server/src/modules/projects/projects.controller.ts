import type { Request, Response } from 'express';
import { parseLang } from '../../shared/http/lang.js';
import { ok } from '../../shared/http/response.js';
import { parseId, validate } from '../../shared/http/validate.js';
import {
  adminListQuery,
  createProjectBody,
  publicListQuery,
  updateProjectBody,
} from './projects.schemas.js';
import type { ProjectsService } from './projects.service.js';

export const createProjectsController = (service: ProjectsService) => ({
  async listPublic(req: Request, res: Response) {
    const { category } = validate(publicListQuery, req.query);
    const projects = await service.listPublic(parseLang(req), category);
    res.json(ok(projects, { count: projects.length }));
  },

  async getPublic(req: Request, res: Response) {
    res.json(ok(await service.getPublic(String(req.params.slug), parseLang(req))));
  },

  async list(req: Request, res: Response) {
    const options = validate(adminListQuery, req.query);
    const projects = await service.list(options);
    res.json(ok(projects, { count: projects.length }));
  },

  async get(req: Request, res: Response) {
    res.json(ok(await service.get(parseId(req.params.id))));
  },

  async create(req: Request, res: Response) {
    const project = await service.create(validate(createProjectBody, req.body));
    res.status(201).json(ok(project));
  },

  async update(req: Request, res: Response) {
    const project = await service.update(
      parseId(req.params.id),
      validate(updateProjectBody, req.body),
    );
    res.json(ok(project));
  },

  async deactivate(req: Request, res: Response) {
    res.json(ok(await service.deactivate(parseId(req.params.id))));
  },

  async reactivate(req: Request, res: Response) {
    res.json(ok(await service.reactivate(parseId(req.params.id))));
  },
});

export type ProjectsController = ReturnType<typeof createProjectsController>;
