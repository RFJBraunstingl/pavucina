"use client";

import { useEffect, useId, useRef, useState } from "react";

import type { SyncConflictDialogProps } from "@/types/shared/sync-conflict";

export default function SyncConflictDialog({
  conflicts,
  onResolve,
}: SyncConflictDialogProps) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (conflicts.length && !dialog.current?.open) dialog.current?.showModal();
    if (!conflicts.length && dialog.current?.open) dialog.current.close();
  }, [conflicts]);

  async function resolve(keepMine: boolean) {
    setBusy(true);
    setError(null);
    try {
      await onResolve(keepMine);
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Could not resolve changes",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      className="app-dialog sync-conflict-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => event.preventDefault()}
    >
      <h2 id={titleId}>Resolve conflicting changes</h2>
      <p>Your edits are kept until you choose which values to save.</p>
      <div
        style={{
          maxHeight: "50dvh",
          overflow: "auto",
          overflowWrap: "anywhere",
        }}
      >
        {conflicts.map((conflict, index) => (
          <div key={index}>
            <strong>{conflict.field}</strong>
            <p>Mine: {JSON.stringify(conflict.mine) ?? "Deleted"}</p>
            <p>Saved: {JSON.stringify(conflict.saved) ?? "Deleted"}</p>
          </div>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="dialog-actions">
        <button disabled={busy} onClick={() => void resolve(false)}>
          Use saved
        </button>
        <button disabled={busy} onClick={() => void resolve(true)}>
          Keep mine
        </button>
      </div>
    </dialog>
  );
}
