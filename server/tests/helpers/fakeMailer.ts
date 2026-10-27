import { vi } from 'vitest';
import { MailError, type Mailer, type OutgoingMail } from '../../src/shared/mail/mailer.js';

// Stand-in for Resend: no network, no credentials. Tests swap it in with vi.mock on
// shared/mail/index.js and drive behaviour through `failWith` and `delayMs`.
export const fakeMailer = {
  send: vi.fn<Mailer['send']>(),
  failWith: null as string | null,
  delayMs: 0,
  sent: [] as { mail: OutgoingMail; idempotencyKey: string }[],

  reset() {
    this.failWith = null;
    this.delayMs = 0;
    this.sent = [];
    this.send.mockReset().mockImplementation(async (mail, { idempotencyKey }) => {
      if (this.delayMs) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      if (this.failWith) throw new MailError(this.failWith);
      this.sent.push({ mail, idempotencyKey });
    });
  },
};

fakeMailer.reset();
