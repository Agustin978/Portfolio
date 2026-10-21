import type { Request, Response } from 'express';
import { parseLang } from '../../shared/http/lang.js';
import { ok } from '../../shared/http/response.js';
import { validate } from '../../shared/http/validate.js';
import { updateProfileBody } from './profile.schemas.js';
import type { ProfileService } from './profile.service.js';

export const createProfileController = (service: ProfileService) => ({
  async getPublic(req: Request, res: Response) {
    res.json(ok(await service.getPublic(parseLang(req))));
  },

  async get(_req: Request, res: Response) {
    res.json(ok(await service.get()));
  },

  async update(req: Request, res: Response) {
    res.json(ok(await service.update(validate(updateProfileBody, req.body))));
  },
});

export type ProfileController = ReturnType<typeof createProfileController>;
