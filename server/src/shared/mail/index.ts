import { env } from '../../config/env.js';
import { createResendMailer } from './resendMailer.js';

const { RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL } = env;

export const mailer = createResendMailer({
  config:
    RESEND_API_KEY && CONTACT_TO_EMAIL && CONTACT_FROM_EMAIL
      ? { apiKey: RESEND_API_KEY, from: CONTACT_FROM_EMAIL, to: CONTACT_TO_EMAIL }
      : null,
});

export { MAIL_NOT_CONFIGURED, MailError } from './mailer.js';
export type { Mailer, OutgoingMail } from './mailer.js';
