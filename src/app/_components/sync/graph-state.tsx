import Link from "next/link";
import AppHeader from "../common/app-header";
import type {
  GraphLoadingProps,
  SyncStatusProps,
} from "@/types/shared/components";

export function GraphLoading({ label, error, onRetry }: GraphLoadingProps) {
  return (
    <main className="app-shell">
      <AppHeader title="Pavucina" loadingLabel={error ? undefined : label} />
      <GraphSyncError error={error} onRetry={onRetry} />
    </main>
  );
}

export function GraphSyncError({ error, onRetry }: SyncStatusProps) {
  if (!error) return null;
  return (
    <p className="sync-error" role="alert">
      {error} <button type="button" onClick={onRetry}>Retry</button>
      {" "}<Link href="/preferences">Open Preferences</Link>
    </p>
  );
}
