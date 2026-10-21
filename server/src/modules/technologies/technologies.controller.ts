import type { Request, Response } from 'express';
import { ok } from '../../shared/http/response.js';
import { parseId, validate } from '../../shared/http/validate.js';
import { createTechnologyBody, updateTechnologyBody } from './technologies.schemas.js';
import type { TechnologiesService } from './technologies.service.js';

export const createTechnologiesController = (service: TechnologiesService) => ({
  // Technology names are single-language, so unlike the other public endpoints there is no ?lang.
  async listSkills(_req: Request, res: Response) {
    const groups = await service.listSkills();
    res.json(ok(groups, { count: groups.length }));
  },

  async list(_req: Request, res: Response) {
    const technologies = await service.list();
    res.json(ok(technologies, { count: technologies.length }));
  },

  async get(req: Request, res: Response) {
    res.json(ok(await service.get(parseId(req.params.id))));
  },

  async create(req: Request, res: Response) {
    const technology = await service.create(validate(createTechnologyBody, req.body));
    res.status(201).json(ok(technology));
  },

  async update(req: Request, res: Response) {
    const technology = await service.update(
      parseId(req.params.id),
      validate(updateTechnologyBody, req.body),
    );
    res.json(ok(technology));
  },

  async remove(req: Request, res: Response) {
    await service.remove(parseId(req.params.id));
    res.json(ok(null));
  },
});

export type TechnologiesController = ReturnType<typeof createTechnologiesController>;
