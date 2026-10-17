"use client";

import { useMemo, useState } from "react";

import AppHeader from "../common/app-header";
import { GraphSyncError } from "../sync/graph-state";
import TaskInspector from "../task/task-inspector";
import TimelineFilters from "./filters/timeline-filters";
import TimelineGrid from "./grid/timeline-grid";
import { createTimelineTaskActions } from "./timeline-task-actions";
import TimelineToolbar from "./timeline-toolbar";
import { useTimelineRange } from "./use-timeline-range";
import { usePreferences } from "../sync/use-preferences";
import { useTimelineFilters } from "./filters/use-timeline-filters";
import { useGraph } from "@/providers/graph-provider";
import { getParentTaskIds } from "@/services/task/core/task-service";
import { DEFAULT_TASK_COLUMN_WIDTH } from "@/utils/task-column";
import { resolvedScheduleMode } from "@/services/preferences/preferences-service";

export default function TimelineView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();
  const {
    preferences,
    patchPreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();
  const range = useTimelineRange(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const collapsedIds = useMemo(
    () => new Set(preferences?.collapsedTaskIds),
    [preferences?.collapsedTaskIds],
  );
  const filters = useTimelineFilters(
    graph,
    preferences?.hideDone ?? true,
    collapsedIds,
  );
  const ready = Boolean(hydrated && graph && preferences);
  const loading = ((!hydrated || !graph) && !syncError) ||
    (!preferences && !preferencesError);
  const scheduleMode = preferences ? resolvedScheduleMode(preferences) : "leaf";
  const taskActions = createTimelineTaskActions({
    scheduleMode,
    onGraphChange: setGraph,
    onSelect: setSelectedId,
  });

  function collapseAll() {
    if (!graph) return;
    patchPreferences({ collapsedTaskIds: [...getParentTaskIds(graph)] });
  }

  function expandAll() {
    patchPreferences({ collapsedTaskIds: [] });
  }

  function updateFilters(depth: number, selectedIds: string[]) {
    const visibleIds = filters.update(depth, selectedIds);
    if (selectedId && visibleIds && !visibleIds.has(selectedId)) {
      setSelectedId(null);
    }
  }

  return (
    <main className="app-shell">
      <AppHeader active="timeline" title="Timeline" loadingLabel={loading ? "Loading timeline…" : undefined} />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />

      <div className="workspace">
        <section className="timeline-card" aria-labelledby="timeline-heading">
          <TimelineToolbar
            days={range.days}
            hideDone={preferences?.hideDone ?? true}
            disabled={!ready}
            onHideDoneChange={(hideDone) => patchPreferences({ hideDone })}
            onCollapseAll={collapseAll}
            onExpandAll={expandAll}
            onPrevious={range.showPrevious}
            onToday={range.showToday}
            onNext={range.showNext}
          />

          <TimelineFilters
            levels={filters.levels}
            active={filters.active}
            onChange={updateFilters}
            onClear={filters.clear}
          />

          {graph && ready ? <TimelineGrid
            graph={graph}
            scheduleMode={scheduleMode}
            days={range.days}
            today={today}
            rangeStart={range.rangeStart}
            selectedId={selectedId}
            tasks={filters.tasks}
            filterExpandedIds={filters.expandedTaskIds}
            filterActive={filters.active}
            taskColumnWidth={
              preferences?.taskColumnWidth ?? DEFAULT_TASK_COLUMN_WIDTH
            }
            collapsedIds={collapsedIds}
            onGraphChange={setGraph}
            onCollapsedIdsChange={(ids) =>
              patchPreferences({ collapsedTaskIds: [...ids] })
            }
            onTaskColumnWidthChange={(taskColumnWidth) =>
              patchPreferences({ taskColumnWidth })
            }
            onSelect={setSelectedId}
            onNameChange={taskActions.rename}
            onAddChild={taskActions.addChild}
            onCreate={taskActions.addTopLevel}
          /> : <div className="loading-region" aria-busy={loading} />}
        </section>

        <TaskInspector
          selectedId={selectedId}
          scheduleMode={scheduleMode}
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </main>
  );
}
