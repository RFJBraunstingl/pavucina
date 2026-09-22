"use client";

import AppHeader from "@/app/_components/common/app-header";
import { GraphLoading, GraphSyncError } from "@/app/_components/sync/graph-state";
import { usePreferences } from "@/app/_components/sync/use-preferences";
import AccountLinks from "./sections/account-links/account-links";
import BackupRestore from "./sections/backup-restore";
import LegalLinks from "./sections/legal-links";
import CalendarImportSettings from "./sections/calendar-import-settings";
import StartupPageSettings from "./sections/startup-page-settings";
import TimelineSettings from "./sections/timeline-settings";
import { useGraph } from "@/providers/graph-provider";
import { resolvedScheduleMode } from "@/services/preferences/preferences-service";
import { clearParentTaskSchedules } from "@/services/task/scheduling/task-schedule-mode-service";

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

  function updateScheduleMode(mode: "leaf" | "all") {
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
      <TimelineSettings
        scheduleMode={scheduleMode}
        disabled={!graph}
        onScheduleModeChange={updateScheduleMode}
        onEnableLeafMode={enableLeafMode}
      />
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
    </main>
  );
}
