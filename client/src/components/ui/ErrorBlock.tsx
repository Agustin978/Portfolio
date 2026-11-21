import { pillClassName } from './PillLink';

interface ErrorBlockProps {
  message: string;
  // Both or neither: without a way to retry, no button.
  retryLabel?: string;
  onRetry?: () => void;
}

// The error state of one section; the rest of the page keeps working.
export function ErrorBlock({ message, retryLabel, onRetry }: ErrorBlockProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-4 rounded-card border border-border bg-surface p-6"
    >
      <p className="m-0 text-base text-muted">{message}</p>
      {onRetry && retryLabel && (
        <button
          type="button"
          onClick={onRetry}
          className={`${pillClassName('secondary')} min-h-11`}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
