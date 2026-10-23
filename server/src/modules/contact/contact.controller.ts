import type { Request, Response } from 'express';
import { ok } from '../../shared/http/response.js';
import { validate } from '../../shared/http/validate.js';
import { contactBody, isHoneypotFilled } from './contact.schemas.js';
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
});

export type ContactController = ReturnType<typeof createContactController>;
