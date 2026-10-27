import { Resend } from 'resend';
import { MAIL_NOT_CONFIGURED, MailError, type Mailer } from './mailer.js';

export type ResendConfig = { apiKey: string; from: string; to: string };

type Sdk = Pick<Resend, 'emails'>;

type Options = {
  // null = no credentials (local development): every send fails fast instead of crashing boot.
  config: ResendConfig | null;
  sdk?: Sdk;
};

export function createResendMailer({ config, sdk }: Options): Mailer {
  const client = config ? (sdk ?? new Resend(config.apiKey)) : null;

  return {
    async send(mail, { idempotencyKey }) {
      if (!config || !client) throw new MailError(MAIL_NOT_CONFIGURED);

      let result;
      try {
        result = await client.emails.send(
          {
            from: config.from,
            to: config.to,
            subject: mail.subject,
            text: mail.text,
            replyTo: mail.replyTo,
          },
          { idempotencyKey },
        );
      } catch {
        // Network-level failure: the thrown error's text is not worth keeping.
        throw new MailError('send_failed');
      }

      if (result.error) {
        // The error name is a fixed Resend code (validation_error, ...); its message is dropped.
        throw new MailError(`send_failed:${result.error.name}`);
      }
    },
  };
}
