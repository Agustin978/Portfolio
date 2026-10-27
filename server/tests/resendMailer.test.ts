import { describe, expect, it, vi } from 'vitest';
import { MailError } from '../src/shared/mail/mailer.js';
import { createResendMailer } from '../src/shared/mail/resendMailer.js';

const config = { apiKey: 're_test', from: 'onboarding@resend.dev', to: 'owner@example.com' };
const mail = { subject: 'Subject', text: 'Body', replyTo: 'visitor@example.com' };

const sdkReturning = (send: ReturnType<typeof vi.fn>) =>
  ({ emails: { send } }) as unknown as Parameters<typeof createResendMailer>[0]['sdk'];

describe('createResendMailer', () => {
  it('sends plain text with reply-to and the idempotency key', async () => {
    const send = vi.fn().mockResolvedValue({ data: { id: 'x' }, error: null });
    const mailer = createResendMailer({ config, sdk: sdkReturning(send) });

    await mailer.send(mail, { idempotencyKey: 'contact-7' });

    expect(send).toHaveBeenCalledWith(
      {
        from: 'onboarding@resend.dev',
        to: 'owner@example.com',
        subject: 'Subject',
        text: 'Body',
        replyTo: 'visitor@example.com',
      },
      { idempotencyKey: 'contact-7' },
    );
    expect(send.mock.calls[0]?.[0]).not.toHaveProperty('html');
  });

  it('keeps only the provider error name, never its message', async () => {
    const send = vi.fn().mockResolvedValue({
      data: null,
      error: {
        name: 'validation_error',
        message: 'bad address owner@example.com',
        statusCode: 422,
      },
    });
    const mailer = createResendMailer({ config, sdk: sdkReturning(send) });

    const failure = await mailer.send(mail, { idempotencyKey: 'k' }).catch((e) => e);

    expect(failure).toBeInstanceOf(MailError);
    expect(failure.reason).toBe('send_failed:validation_error');
    expect(failure.message).not.toContain('owner@example.com');
  });

  it('turns a thrown network error into a generic reason', async () => {
    const send = vi.fn().mockRejectedValue(new Error('ECONNRESET to api.resend.com for a@b.c'));
    const mailer = createResendMailer({ config, sdk: sdkReturning(send) });

    const failure = await mailer.send(mail, { idempotencyKey: 'k' }).catch((e) => e);

    expect(failure.reason).toBe('send_failed');
  });

  it('fails fast with "not configured" when there are no credentials', async () => {
    const mailer = createResendMailer({ config: null });

    const failure = await mailer.send(mail, { idempotencyKey: 'k' }).catch((e) => e);

    expect(failure).toBeInstanceOf(MailError);
    expect(failure.reason).toBe('not configured');
  });
});
