import type { Request, Response } from 'express';
import { parseLang } from '../../shared/http/lang.js';
import { ok } from '../../shared/http/response.js';
import { parseId, validate } from '../../shared/http/validate.js';
import {
  adminListQuery,
  createExperienceBody,
  updateExperienceBody,
} from './experiences.schemas.js';
import type { ExperiencesService } from './experiences.service.js';

export const createExperiencesController = (service: ExperiencesService) => ({
  async listPublic(req: Request, res: Response) {
    const experiences = await service.listPublic(parseLang(req));
    res.json(ok(experiences, { count: experiences.length }));
  },

  async list(req: Request, res: Response) {
    const options = validate(adminListQuery, req.query);
    const experiences = await service.list(options);
    res.json(ok(experiences, { count: experiences.length }));
  },

  async get(req: Request, res: Response) {
    res.json(ok(await service.get(parseId(req.params.id))));
  },

  async create(req: Request, res: Response) {
    const experience = await service.create(validate(createExperienceBody, req.body));
    res.status(201).json(ok(experience));
  },

  async update(req: Request, res: Response) {
    const experience = await service.update(
      parseId(req.params.id),
      validate(updateExperienceBody, req.body),
    );
    res.json(ok(experience));
  },

  async deactivate(req: Request, res: Response) {
    res.json(ok(await service.deactivate(parseId(req.params.id))));
  },

  async reactivate(req: Request, res: Response) {
    res.json(ok(await service.reactivate(parseId(req.params.id))));
  },
});

export type ExperiencesController = ReturnType<typeof createExperiencesController>;
