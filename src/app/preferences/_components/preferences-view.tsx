"use client";

import { useRef } from "react";

import AppHeader from "../../_components/app-header";
import { GraphLoading, GraphSyncError } from "../../_components/graph-state";
import { usePreferences } from "../../_components/use-preferences";
import { useGraph } from "@/providers/graph-provider";
import { resolvedScheduleMode } from "@/services/preferences-service";
import { clearParentTaskSchedules } from "@/services/task-schedule-mode-service";
import type { ScheduleMode } from "@/types/preferences";

export default function PreferencesView() {
  const { graph, setGraph, hydrated, syncError, retry } = useGraph();
  const {
    preferences,
    setPreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();
  const leafModeDialog = useRef<HTMLDialogElement>(null);

  if (!hydrated || !graph) {
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
        <fieldset className="schedule-mode-options">
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
      <dialog
        ref={leafModeDialog}
        className="delete-dialog"
        aria-labelledby="leaf-mode-dialog-heading"
      >
        <form method="dialog">
          <h3 id="leaf-mode-dialog-heading">Enable leaf scheduling?</h3>
          <p>
            Planned dates and times stored on tasks with children will be
            permanently deleted. This cannot be undone.
          </p>
          <div className="delete-dialog-actions">
            <button type="submit" autoFocus>Cancel</button>
            <button
              type="submit"
              className="confirm-delete"
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
