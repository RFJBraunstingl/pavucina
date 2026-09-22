"use client";

import { useRef, useState, type ChangeEvent } from "react";

import ConfirmationDialog from "@/app/_components/common/confirmation-dialog";
import {
  createBackupArchive,
  readBackupArchive,
} from "@/services/backup/backup-service";
import type { BackupRestoreProps } from "@/types/shared/backup";

export default function BackupRestore({ graph, preferences, onRestore }: BackupRestoreProps) {
  const input = useRef<HTMLInputElement>(null);
  const [pendingBackup, setPendingBackup] = useState<ReturnType<
    typeof readBackupArchive
  > | null>(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [restoring, setRestoring] = useState(false);

  function downloadBackup() {
    if (!graph) return;
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
      setPendingBackup(readBackupArchive(
        new Uint8Array(await file.arrayBuffer()),
      ));
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Invalid backup file.");
    } finally {
      setRestoring(false);
    }
  }

  async function confirmRestore() {
    const backup = pendingBackup;
    if (!backup) return;
    setRestoring(true);
    try {
      const settingsRestored = await onRestore(
        backup.graph,
        backup.preferences,
      );
      setIsError(!settingsRestored);
      setMessage(
        settingsRestored
          ? "Backup restored."
          : "Graph restored, but settings could not be restored. Check your settings.",
      );
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Restore failed.");
    } finally {
      setRestoring(false);
      setPendingBackup(null);
    }
  }

  return (
    <section className="preferences-card backup-restore" aria-labelledby="backup-restore">
      <header>
        <p className="eyebrow">Data</p>
        <h2 id="backup-restore">Backup &amp; Restore</h2>
        <p>Download all data as a ZIP, or replace it from a previous backup.</p>
      </header>
      <div className="backup-actions">
        <button type="button" disabled={!graph} onClick={downloadBackup}>Download backup</button>
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
      <ConfirmationDialog
        open={Boolean(pendingBackup)}
        title="Restore backup?"
        message="All current tasks, relationships, and settings will be replaced. This cannot be undone."
        confirmLabel="Restore"
        busy={restoring}
        busyLabel="Restoring…"
        onConfirm={() => void confirmRestore()}
        onClose={() => setPendingBackup(null)}
      />
    </section>
  );
}
