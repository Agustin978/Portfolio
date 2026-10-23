export type OutgoingMail = {
  subject: string;
  // Plain text only: visitor input is never rendered as HTML.
  text: string;
  replyTo: string;
};

// The only door to the email provider: nothing outside shared/mail imports the vendor SDK.
// Implementations reject on any failure; the idempotency key makes a repeated call for the
// same message safe.
export interface Mailer {
  send(mail: OutgoingMail, options: { idempotencyKey: string }): Promise<void>;
}

// Carries only a short, non-sensitive token (never the provider's message, which can echo
// the recipient or the content) so callers can store and log it as is.
export class MailError extends Error {
  constructor(public readonly reason: string) {
    super(reason);
    this.name = 'MailError';
  }
}

export const MAIL_NOT_CONFIGURED = 'not configured';
