import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useId, useRef, type ReactElement } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLang } from '../../app/useLang';
import { pillClassName } from '../../components/ui/PillLink';
import { useSendContactMessage } from '../../hooks/queries';
import { canRetry, errorMessageKey } from '../../lib/apiErrors';
import { ApiError } from '../../services/apiClient';
import {
  contactSchema,
  MESSAGE_MAX,
  MESSAGE_VALUES,
  type ContactFields,
  type ContactValues,
} from './contactSchema';

type FieldName = keyof typeof MESSAGE_VALUES;

const EMPTY: ContactFields = { name: '', email: '', message: '', hp_check: '' };

// When the server rejects a field the client schema let through, its details only say which
// field failed; each field gets its own generic message.
const SERVER_FIELD_MESSAGES: Record<FieldName, string> = {
  name: 'form.errors.nameInvalid',
  email: 'form.errors.emailInvalid',
  message: 'form.errors.messageInvalid',
};

const fieldClassName =
  'w-full rounded-xl border border-border-field bg-ink px-4 text-base text-bg transition-colors hover:border-border-hover aria-[invalid=true]:border-danger-on-dark';

// The form in the contact panel. The values are never logged or stored: they live in the form
// state until they are sent, and stay there if sending fails.
export function ContactForm({ mailto, email }: { mailto: string | null; email?: string }) {
  const { t } = useTranslation();
  const lang = useLang();
  const send = useSendContactMessage();
  const ids = useId();
  const sending = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ContactFields, unknown, ContactValues>({
    resolver: zodResolver(contactSchema),
    mode: 'onTouched',
    shouldFocusError: true,
    defaultValues: EMPTY,
  });

  const sent = send.isSuccess;
  const wasSent = useRef(false);
  useEffect(() => {
    if (sent) successHeading.current?.focus();
    // "Enviar otro mensaje" brings the form back: focus its first field.
    else if (wasSent.current) setFocus('name');
    wasSent.current = sent;
  }, [sent, setFocus]);

  const onSubmit = async (values: ContactValues) => {
    // A ref, not the mutation state: two quick clicks can both pass before a re-render.
    if (sending.current) return;
    sending.current = true;
    try {
      await send.mutateAsync({ ...values, lang });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) markServerErrors(error.details);
    } finally {
      sending.current = false;
    }
  };

  const markServerErrors = (details: unknown) => {
    if (typeof details !== 'object' || details === null) return;
    const fields = (Object.keys(SERVER_FIELD_MESSAGES) as FieldName[]).filter(
      (field) => field in details,
    );
    fields.forEach((field, index) =>
      setError(
        field,
        { type: 'server', message: SERVER_FIELD_MESSAGES[field] },
        { shouldFocus: index === 0 },
      ),
    );
  };

  const submit = handleSubmit(onSubmit);

  if (sent) {
    return (
      <div className="flex flex-col items-start gap-6">
        <div role="status" className="flex flex-col gap-2">
          <h3
            ref={successHeading}
            tabIndex={-1}
            className="m-0 text-[22px] leading-[1.2] font-semibold tracking-[-0.02em]"
          >
            {t('form.success.title')}
          </h3>
          <p className="m-0 text-base leading-[1.6] text-border-strong">{t('form.success.body')}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset(EMPTY);
            send.reset();
          }}
          className={pillClassName('ghost')}
        >
          {t('form.success.again')}
        </button>
      </div>
    );
  }

  const failure = send.error;
  const retryable = failure !== null && canRetry(failure);
  const messageLength = watch('message').length;
  const fieldError = (field: FieldName) => {
    const key = errors[field]?.message;
    return key ? t(key, MESSAGE_VALUES[field]) : undefined;
  };

  return (
    <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-5">
      <Field
        id={`${ids}-name`}
        label={t('form.name')}
        error={fieldError('name')}
        control={(a11y) => (
          <input
            type="text"
            autoComplete="name"
            aria-required="true"
            {...a11y}
            className={`${fieldClassName} min-h-12`}
            {...register('name')}
          />
        )}
      />
      <Field
        id={`${ids}-email`}
        label={t('form.email')}
        error={fieldError('email')}
        control={(a11y) => (
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            aria-required="true"
            {...a11y}
            className={`${fieldClassName} min-h-12`}
            {...register('email')}
          />
        )}
      />
      <Field
        id={`${ids}-message`}
        label={t('form.message')}
        error={fieldError('message')}
        hintId={`${ids}-counter`}
        control={(a11y) => (
          <textarea
            rows={6}
            aria-required="true"
            {...a11y}
            className={`${fieldClassName} min-h-40 resize-y py-3 leading-[1.6]`}
            {...register('message')}
          />
        )}
      />

      <Honeypot registration={register('hp_check')} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p
          id={`${ids}-counter`}
          className="m-0 font-mono text-[13px] tracking-[0.04em] text-border-hover"
        >
          {t('form.counter', { count: messageLength, max: MESSAGE_MAX })}
        </p>
        <button
          type="submit"
          aria-disabled={send.isPending}
          className={`${pillClassName('light')} aria-disabled:cursor-progress aria-disabled:opacity-70`}
        >
          {send.isPending ? t('form.sending') : t('form.submit')}
        </button>
      </div>

      {failure && (
        <div
          role="alert"
          className="flex flex-col items-start gap-4 rounded-card border border-danger-on-dark p-5"
        >
          <p className="m-0 text-base leading-[1.6] text-bg">{t(errorMessageKey(failure))}</p>
          {retryable && (
            <button
              type="button"
              onClick={() => void submit()}
              className={`${pillClassName('ghost')} min-h-11`}
            >
              {t('errors.retry')}
            </button>
          )}
          {retryable && mailto && email && (
            <p className="m-0 text-base leading-[1.6] text-border-strong">
              {t('form.fallback')}{' '}
              <a
                href={mailto}
                className="-my-2.5 inline-block py-2.5 font-medium text-bg underline decoration-border-field underline-offset-4 hover:decoration-bg"
              >
                {email}
              </a>
            </p>
          )}
        </div>
      )}
    </form>
  );
}

interface FieldA11y {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby'?: string;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  // A description that is always there, such as the message counter.
  hintId?: string;
  control: (a11y: FieldA11y) => ReactElement;
}

// The label stays visible above its field (never only a placeholder); the error sits below.
function Field({ id, label, error, hintId, control }: FieldProps) {
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hintId].filter(Boolean).join(' ');
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-bg">
        {label}
      </label>
      {control({
        id,
        'aria-invalid': error !== undefined,
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {error && (
        <p id={errorId} className="m-0 text-sm leading-[1.5] text-danger-on-dark">
          {error}
        </p>
      )}
    </div>
  );
}

// The trap from docs/api.md: off screen with CSS (bots spot display:none and type="hidden"),
// hidden from screen readers and out of the tab order. A person never fills it.
function Honeypot({ registration }: { registration: UseFormRegisterReturn }) {
  return (
    <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
      <input type="text" autoComplete="off" tabIndex={-1} aria-hidden="true" {...registration} />
    </div>
  );
}
