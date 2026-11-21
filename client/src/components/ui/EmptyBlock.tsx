export function EmptyBlock({ message }: { message: string }) {
  return (
    <p className="m-0 rounded-card border border-dashed border-border-strong p-6 text-base text-muted">
      {message}
    </p>
  );
}
