"use client";

import { useRef, useState, type ChangeEvent } from "react";

import {
  createBackupArchive,
  readBackupArchive,
} from "@/services/backup-service";
import type { Graph } from "@/types/graph";
import type { UserPreferences } from "@/types/preferences";

type Props = {
  graph: Graph;
  preferences: UserPreferences;
  onRestore: (graph: Graph, preferences: UserPreferences) => void;
};

export default function BackupRestore({ graph, preferences, onRestore }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const restoreDialog = useRef<HTMLDialogElement>(null);
  const pendingBackup = useRef<ReturnType<typeof readBackupArchive>>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [restoring, setRestoring] = useState(false);

  function downloadBackup() {
    const archive = createBackupArchive(graph, preferences);
    const url = URL.createObjectURL(
      new Blob([new Uint8Array(archive)], { type: "application/zip" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `pavucina-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setIsError(false);
    setMessage("Backup downloaded.");
  }

  async function restoreBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setRestoring(true);
    try {
      pendingBackup.current = readBackupArchive(
        new Uint8Array(await file.arrayBuffer()),
      );
      restoreDialog.current?.showModal();
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Invalid backup file.");
    } finally {
      setRestoring(false);
    }
  }

  function confirmRestore() {
    const backup = pendingBackup.current;
    if (!backup) return;
    onRestore(backup.graph, backup.preferences);
    setIsError(false);
    setMessage("Backup restored.");
  }

  return (
    <section className="preferences-card backup-restore" aria-labelledby="backup-restore">
      <header>
        <p className="eyebrow">Data</p>
        <h2 id="backup-restore">Backup &amp; Restore</h2>
        <p>Download all data as a ZIP, or replace it from a previous backup.</p>
      </header>
      <div className="backup-actions">
        <button type="button" onClick={downloadBackup}>Download backup</button>
        <button type="button" disabled={restoring} onClick={() => input.current?.click()}>
          {restoring ? "Restoring…" : "Restore backup"}
        </button>
        <input
          ref={input}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={restoreBackup}
        />
      </div>
      {message && (
        <p className={isError ? "backup-message error" : "backup-message"} role="status">
          {message}
        </p>
      )}
      <dialog
        ref={restoreDialog}
        className="delete-dialog"
        aria-labelledby="restore-dialog-heading"
        onClose={() => { pendingBackup.current = null; }}
      >
        <form method="dialog">
          <h3 id="restore-dialog-heading">Restore backup?</h3>
          <p>
            All current tasks, relationships, and settings will be replaced.
            This cannot be undone.
          </p>
          <div className="delete-dialog-actions">
            <button type="submit" autoFocus>Cancel</button>
            <button
              type="submit"
              className="confirm-delete"
              onClick={confirmRestore}
            >
              Restore
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
