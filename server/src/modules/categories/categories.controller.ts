import type { Request, Response } from 'express';
import { ok } from '../../shared/http/response.js';
import { parseLang } from '../../shared/http/lang.js';
import { parseId, validate } from '../../shared/http/validate.js';
import { createCategoryBody, updateCategoryBody } from './categories.schemas.js';
import type { CategoriesService } from './categories.service.js';

export const createCategoriesController = (service: CategoriesService) => ({
  async listPublic(req: Request, res: Response) {
    const categories = await service.listPublic(parseLang(req));
    res.json(ok(categories, { count: categories.length }));
  },

  async list(_req: Request, res: Response) {
    const categories = await service.list();
    res.json(ok(categories, { count: categories.length }));
  },

  async get(req: Request, res: Response) {
    res.json(ok(await service.get(parseId(req.params.id))));
  },

  async create(req: Request, res: Response) {
    const category = await service.create(validate(createCategoryBody, req.body));
    res.status(201).json(ok(category));
  },

  async update(req: Request, res: Response) {
    const category = await service.update(
      parseId(req.params.id),
      validate(updateCategoryBody, req.body),
    );
    res.json(ok(category));
  },

  async remove(req: Request, res: Response) {
    await service.remove(parseId(req.params.id));
    res.json(ok(null));
  },
});

export type CategoriesController = ReturnType<typeof createCategoriesController>;
