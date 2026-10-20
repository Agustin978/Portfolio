import type { Request, Response } from 'express';
import { ok } from '../../shared/http/response.js';
import { healthService } from './health.service.js';

export const healthController = {
  get(_req: Request, res: Response) {
    res.json(ok(healthService.getStatus()));
  },
};
