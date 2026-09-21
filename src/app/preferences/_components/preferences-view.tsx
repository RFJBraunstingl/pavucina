"use client";

import { useRef } from "react";

import AppHeader from "@/app/_components/common/app-header";
import { GraphLoading, GraphSyncError } from "@/app/_components/sync/graph-state";
import { usePreferences } from "@/app/_components/sync/use-preferences";
import AccountLinks from "./sections/account-links";
import BackupRestore from "./sections/backup-restore";
import LegalLinks from "./sections/legal-links";
import CalendarImportSettings from "./sections/calendar-import-settings";
import StartupPageSettings from "./sections/startup-page-settings";
import { useGraph } from "@/providers/graph-provider";
import { resolvedScheduleMode } from "@/services/preferences/preferences-service";
import { clearParentTaskSchedules } from "@/services/task/scheduling/task-schedule-mode-service";
import type { ScheduleMode } from "@/types/preferences/preferences";

export default function PreferencesView() {
  const { graph, setGraph, restoreGraph, hydrated, syncError, retry } =
    useGraph();
  const {
    preferences,
    setPreferences,
    restorePreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();
  const leafModeDialog = useRef<HTMLDialogElement>(null);

  if (!hydrated || (!graph && !syncError)) {
    return <GraphLoading label="Loading preferences…" error={syncError} onRetry={retry} />;
  }
  if (!preferences) {
    return (
      <GraphLoading
        label="Loading preferences…"
        error={preferencesError}
        onRetry={retryPreferences}
      />
    );
  }
  const scheduleMode = resolvedScheduleMode(preferences);

  function selectMode(mode: ScheduleMode) {
    if (mode === scheduleMode) return;
    if (mode === "leaf") return leafModeDialog.current?.showModal();
    setPreferences((current) =>
      current ? { ...current, scheduleMode: mode } : current,
    );
  }

  function enableLeafMode() {
    setGraph((current) =>
      current ? clearParentTaskSchedules(current) : current,
    );
    setPreferences((current) =>
      current ? { ...current, scheduleMode: "leaf" } : current,
    );
  }

  return (
    <main className="app-shell">
      <AppHeader active="preferences" title="Preferences" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />
      <section className="preferences-card" aria-labelledby="timeline-preferences">
        <header>
          <p className="eyebrow">Preferences</p>
          <h2 id="timeline-preferences">Timeline</h2>
        </header>
        <fieldset className="schedule-mode-options" disabled={!graph}>
          <legend>Scheduling mode</legend>
          <label>
            <input
              type="radio"
              name="schedule-mode"
              checked={scheduleMode === "leaf"}
              onChange={() => selectMode("leaf")}
            />
            <span>
              <strong>Leaf tasks only</strong>
              Parent dates are calculated from their scheduled child tasks.
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="schedule-mode"
              checked={scheduleMode === "all"}
              onChange={() => selectMode("all")}
            />
            <span>
              <strong>All tasks</strong>
              Every task keeps and displays its own schedule.
            </span>
          </label>
        </fieldset>
      </section>
      <StartupPageSettings
        preferences={preferences}
        onChange={(changes) =>
          setPreferences((current) =>
            current ? { ...current, ...changes } : current,
          )
        }
      />
      <CalendarImportSettings />
      <AccountLinks />
      <BackupRestore
        graph={graph}
        preferences={preferences}
        onRestore={async (nextGraph, nextPreferences) => {
          await restoreGraph(nextGraph);
          try {
            await restorePreferences(nextPreferences);
            return true;
          } catch {
            return false;
          }
        }}
      />
      <LegalLinks />
      <dialog
        ref={leafModeDialog}
        className="app-dialog"
        aria-labelledby="leaf-mode-dialog-heading"
      >
        <form method="dialog">
          <h3 id="leaf-mode-dialog-heading">Enable leaf scheduling?</h3>
          <p>
            Planned dates and times stored on tasks with children will be
            permanently deleted. This cannot be undone.
          </p>
          <div className="dialog-actions">
            <button type="submit" autoFocus>Cancel</button>
            <button
              type="submit"
              className="dialog-danger"
              onClick={enableLeafMode}
            >
              Delete schedules and enable
            </button>
          </div>
        </form>
      </dialog>
    </main>
  );
}
