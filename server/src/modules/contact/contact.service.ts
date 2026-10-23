import { MailError, type Mailer, type OutgoingMail } from '../../shared/mail/mailer.js';
import type { ContactRepository } from './contact.repository.js';
import type { ContactInput } from './contact.schemas.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const SUBJECT_NAME_MAX = 60;
const ERROR_MAX = 100;

type Options = {
  repository: ContactRepository;
  mailer: Mailer;
  // Injectable so tests can use tiny values instead of waiting 5 s or inserting 50 rows.
  sendTimeoutMs?: number;
  dailyCap?: number;
  now?: () => Date;
};

// The name is already single-line; this only bounds the subject. Array.from keeps a surrogate
// pair (an emoji) from being cut in half.
const subjectName = (name: string) => {
  const chars = Array.from(name);
  return chars.length > SUBJECT_NAME_MAX ? `${chars.slice(0, SUBJECT_NAME_MAX).join('')}…` : name;
};

const buildMail = ({ name, email, message, lang }: ContactInput): OutgoingMail => ({
  subject: `Nuevo mensaje de contacto de ${subjectName(name)}`,
  text: `Nombre: ${name}\nEmail: ${email}\nIdioma: ${lang}\n\n${message}`,
  replyTo: email,
});

// What gets stored in email_error: a short fixed token, never provider text or visitor data.
const reasonOf = (error: unknown) =>
  (error instanceof MailError ? error.reason : 'send_failed').slice(0, ERROR_MAX);

export const createContactService = ({
  repository,
  mailer,
  sendTimeoutMs = 5000,
  dailyCap = 50,
  now = () => new Date(),
}: Options) => {
  // The email may still go out after the timeout, so a "timeout" row can be a delivered message.
  const sendWithTimeout = async (mail: OutgoingMail, idempotencyKey: string) => {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new MailError('timeout')), sendTimeoutMs);
    });
    const sending = mailer.send(mail, { idempotencyKey });
    // If the timeout wins, a later rejection of the send must not become an unhandled rejection.
    sending.catch(() => {});
    try {
      await Promise.race([sending, timeout]);
    } finally {
      clearTimeout(timer);
    }
  };

  // Only ids and states go to the log: the visitor's data stays out of it.
  const record = async (id: number, outcome: { sent: true } | { reason: string }) => {
    try {
      if ('sent' in outcome) await repository.markSent(id, now());
      else {
        console.error('Contact email not sent', { id, reason: outcome.reason });
        await repository.markFailed(id, outcome.reason);
      }
    } catch {
      console.error('Contact message status could not be updated', { id });
    }
  };

  return {
    // The message is stored before anything else can go wrong. Whatever happens while emailing,
    // the visitor's request has succeeded: this never throws because of the mailer.
    async submit(input: ContactInput) {
      const sentToday = await repository.countSentSince(new Date(now().getTime() - DAY_MS));
      if (sentToday >= dailyCap) {
        const { id } = await repository.create(input, {
          emailStatus: 'failed',
          emailError: 'daily_cap',
        });
        console.error('Contact email not sent', { id, reason: 'daily_cap' });
        return;
      }

      const { id } = await repository.create(input);
      try {
        // Same key if this id is ever sent twice, so Resend delivers it once.
        await sendWithTimeout(buildMail(input), `contact-${id}`);
      } catch (error) {
        await record(id, { reason: reasonOf(error) });
        return;
      }
      await record(id, { sent: true });
    },
  };
};

export type ContactService = ReturnType<typeof createContactService>;
