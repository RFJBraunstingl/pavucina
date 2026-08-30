type Props = {
  error: string | null;
  onRetry: () => void;
};

export function GraphLoading({ label, error, onRetry }: Props & { label: string }) {
  return (
    <main className="loading-screen">
      {!error && <span className="brand-mark" aria-hidden="true" />}
      <p role={error ? "alert" : undefined}>{error ?? label}</p>
      {error && <button type="button" onClick={onRetry}>Retry</button>}
    </main>
  );
}

export function GraphSyncError({ error, onRetry }: Props) {
  if (!error) return null;
  return (
    <p className="sync-error" role="alert">
      {error} <button type="button" onClick={onRetry}>Retry</button>
    </p>
  );
}
