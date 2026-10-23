import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createContactRepository } from '../src/modules/contact/contact.repository.js';
import { createContactService } from '../src/modules/contact/contact.service.js';
import { createResendMailer } from '../src/shared/mail/resendMailer.js';
import { fakeMailer } from './helpers/fakeMailer.js';
import { createTestDb, resetDb, type TestDb } from './helpers/testDb.js';

let db: TestDb;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  db = createTestDb();
});
afterAll(() => db.$disconnect());
beforeEach(async () => {
  await resetDb(db);
  fakeMailer.reset();
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

const input = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  message: 'Hola, quiero hablar de un proyecto.',
  lang: 'es' as const,
};

const build = (options: Partial<Parameters<typeof createContactService>[0]> = {}) =>
  createContactService({
    repository: createContactRepository(db),
    mailer: fakeMailer,
    ...options,
  });

const onlyRow = () => db.contactMessage.findFirstOrThrow();

describe('contact service: sending', () => {
  it('emails the owner as plain text with reply-to and marks the row sent', async () => {
    await build().submit(input);

    const row = await onlyRow();
    expect(row.emailStatus).toBe('sent');
    expect(row.sentAt).toBeInstanceOf(Date);
    expect(row.emailError).toBeNull();
    expect(fakeMailer.sent).toHaveLength(1);
    const { mail, idempotencyKey } = fakeMailer.sent[0]!;
    expect(mail).toEqual({
      subject: 'Nuevo mensaje de contacto de Ana Pérez',
      text: `Nombre: Ana Pérez\nEmail: ana@example.com\nIdioma: es\n\n${input.message}`,
      replyTo: 'ana@example.com',
    });
    expect(idempotencyKey).toBe(`contact-${row.id}`);
  });

  it('truncates a long name in the subject without splitting an emoji', async () => {
    await build().submit({ ...input, name: '😀'.repeat(100) });

    const { subject } = fakeMailer.sent[0]!.mail;
    expect(subject).toBe(`Nuevo mensaje de contacto de ${'😀'.repeat(60)}…`);
  });

  it('saves the row as failed with the reason when the mailer fails, and does not throw', async () => {
    fakeMailer.failWith = 'send_failed:validation_error';

    await expect(build().submit(input)).resolves.toBeUndefined();

    const row = await onlyRow();
    expect(row).toMatchObject({
      emailStatus: 'failed',
      emailError: 'send_failed:validation_error',
      sentAt: null,
    });
  });

  it('swallows an unexpected mailer error and stores a generic reason', async () => {
    fakeMailer.send.mockRejectedValueOnce(new Error('boom for ana@example.com'));

    await expect(build().submit(input)).resolves.toBeUndefined();

    expect((await onlyRow()).emailError).toBe('send_failed');
  });

  it('marks the row failed with "timeout" when the mailer is too slow, and does not throw', async () => {
    fakeMailer.delayMs = 300;

    await expect(build({ sendTimeoutMs: 30 }).submit(input)).resolves.toBeUndefined();

    expect(await onlyRow()).toMatchObject({ emailStatus: 'failed', emailError: 'timeout' });
  });

  it('does not leave an unhandled rejection when a timed-out send fails later', async () => {
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    fakeMailer.delayMs = 80;
    fakeMailer.failWith = 'send_failed';

    await build({ sendTimeoutMs: 20 }).submit(input);
    await new Promise((resolve) => setTimeout(resolve, 150));
    process.off('unhandledRejection', unhandled);

    expect(unhandled).not.toHaveBeenCalled();
  });

  it('saves the message as failed "not configured" when there are no Resend credentials', async () => {
    await build({ mailer: createResendMailer({ config: null }) }).submit(input);

    expect(await onlyRow()).toMatchObject({
      emailStatus: 'failed',
      emailError: 'not configured',
    });
  });

  it('still succeeds when the status update fails after the send', async () => {
    const repository = createContactRepository(db);
    const service = createContactService({
      repository: { ...repository, markSent: vi.fn().mockRejectedValue(new Error('db down')) },
      mailer: fakeMailer,
    });

    await expect(service.submit(input)).resolves.toBeUndefined();

    expect(fakeMailer.sent).toHaveLength(1);
    expect((await onlyRow()).emailStatus).toBe('pending');
  });
});

describe('contact service: daily cap', () => {
  const sentRow = (sentAt: Date, emailStatus: 'sent' | 'failed' = 'sent') => ({
    name: 'x',
    email: 'x@example.com',
    message: 'previous message',
    emailStatus,
    sentAt: emailStatus === 'sent' ? sentAt : null,
  });

  it('saves without sending, as failed "daily_cap", once the cap is reached', async () => {
    const now = new Date('2026-10-23T12:00:00Z');
    await db.contactMessage.createMany({
      data: [sentRow(new Date('2026-10-23T11:00:00Z')), sentRow(new Date('2026-10-23T01:00:00Z'))],
    });

    await expect(build({ dailyCap: 2, now: () => now }).submit(input)).resolves.toBeUndefined();

    const row = await db.contactMessage.findFirstOrThrow({ orderBy: { id: 'desc' } });
    expect(row).toMatchObject({ emailStatus: 'failed', emailError: 'daily_cap', sentAt: null });
    expect(row.message).toBe(input.message);
    expect(fakeMailer.send).not.toHaveBeenCalled();
  });

  it('sends while below the cap, and ignores older or failed rows', async () => {
    const now = new Date('2026-10-23T12:00:00Z');
    await db.contactMessage.createMany({
      data: [
        sentRow(new Date('2026-10-22T11:59:00Z')),
        sentRow(new Date('2026-10-23T11:00:00Z'), 'failed'),
      ],
    });

    await build({ dailyCap: 1, now: () => now }).submit(input);

    expect(fakeMailer.sent).toHaveLength(1);
  });

  it('counts a message as sent only after it went out, so a cap hit is not self-inflicted', async () => {
    const service = build({ dailyCap: 2 });

    await service.submit(input);
    await service.submit(input);
    await service.submit(input);

    expect(fakeMailer.sent).toHaveLength(2);
    const rows = await db.contactMessage.findMany({ orderBy: { id: 'asc' } });
    expect(rows.map((r) => r.emailError)).toEqual([null, null, 'daily_cap']);
  });
});

describe('contact service: privacy', () => {
  it('never writes the name, email or message to the log, only ids and reasons', async () => {
    fakeMailer.failWith = 'send_failed';
    await build().submit(input);
    fakeMailer.reset();
    fakeMailer.delayMs = 100;
    await build({ sendTimeoutMs: 10 }).submit(input);

    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(errorSpy).toHaveBeenCalled();
    expect(logged).not.toContain('Ana');
    expect(logged).not.toContain('ana@example.com');
    expect(logged).not.toContain('proyecto');
  });

  it('rethrows a failed insert without the submitted values in its text', async () => {
    const repository = createContactRepository(db);
    const invalid = { ...input, name: 'visitor-secret-name', lang: 'xx' as 'es' };

    const failure = await repository.create(invalid).catch((e: Error) => e);

    expect(failure).toBeInstanceOf(Error);
    expect(String((failure as Error).message)).not.toContain('visitor-secret-name');
    expect(String((failure as Error).message)).not.toContain('ana@example.com');
  });
});
