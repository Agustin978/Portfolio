import type { Request, Response } from 'express';
import { ok } from '../../shared/http/response.js';
import { parseId, validate } from '../../shared/http/validate.js';
import {
  adminListQuery,
  contactBody,
  isHoneypotFilled,
  updateContactMessageBody,
} from './contact.schemas.js';
import type { ContactService } from './contact.service.js';

const received = () => ok({ received: true });

export const createContactController = (service: ContactService) => ({
  async submit(req: Request, res: Response) {
    if (isHoneypotFilled(req.body)) {
      res.status(201).json(received());
      return;
    }
    const { name, email, message, lang } = validate(contactBody, req.body);
    await service.submit({ name, email, message, lang });
    res.status(201).json(received());
  },

  async list(req: Request, res: Response) {
    const { items, meta } = await service.list(validate(adminListQuery, req.query));
    res.json(ok(items, meta));
  },

  async get(req: Request, res: Response) {
    res.json(ok(await service.get(parseId(req.params.id))));
  },

  async update(req: Request, res: Response) {
    const { isRead } = validate(updateContactMessageBody, req.body);
    res.json(ok(await service.setRead(parseId(req.params.id), isRead)));
  },

  async remove(req: Request, res: Response) {
    await service.remove(parseId(req.params.id));
    res.json(ok(null));
  },
});

export type ContactController = ReturnType<typeof createContactController>;
