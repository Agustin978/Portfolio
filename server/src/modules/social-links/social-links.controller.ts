import type { Request, Response } from 'express';
import { ok } from '../../shared/http/response.js';
import { parseId, validate } from '../../shared/http/validate.js';
import { createSocialLinkBody, updateSocialLinkBody } from './social-links.schemas.js';
import type { SocialLinksService } from './social-links.service.js';

export const createSocialLinksController = (service: SocialLinksService) => ({
  async listPublic(_req: Request, res: Response) {
    const links = await service.listPublic();
    res.json(ok(links, { count: links.length }));
  },

  async list(_req: Request, res: Response) {
    const links = await service.list();
    res.json(ok(links, { count: links.length }));
  },

  async create(req: Request, res: Response) {
    const link = await service.create(validate(createSocialLinkBody, req.body));
    res.status(201).json(ok(link));
  },

  async update(req: Request, res: Response) {
    const link = await service.update(
      parseId(req.params.id),
      validate(updateSocialLinkBody, req.body),
    );
    res.json(ok(link));
  },
});

export type SocialLinksController = ReturnType<typeof createSocialLinksController>;
