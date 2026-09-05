"use client";

import { useMemo, useState } from "react";

import AppHeader from "./app-header";
import { GraphLoading, GraphSyncError } from "./graph-state";
import TaskInspector from "./task-inspector";
import TimelineGrid from "./timeline-grid";
import { usePreferences } from "./use-preferences";
import { useGraph } from "@/providers/graph-provider";
import {
  addChildTask,
  addTopLevelTask,
  getParentTaskIds,
  renameTask,
} from "@/services/task-service";
import { addDays, makeDateRange, rangeLabel } from "@/utils/date";
import { DEFAULT_TASK_COLUMN_WIDTH } from "@/utils/task-column";
import type { UserPreferences } from "@/types/preferences";

export default function TimelineView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();
  const {
    preferences,
    setPreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();
  const [rangeStart, setRangeStart] = useState(() => addDays(today, -14));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const days = useMemo(() => makeDateRange(rangeStart), [rangeStart]);
  const collapsedIds = useMemo(
    () => new Set(preferences?.collapsedTaskIds),
    [preferences?.collapsedTaskIds],
  );
  if (!hydrated || !graph) {
    return <GraphLoading label="Loading timeline…" error={syncError} onRetry={retry} />;
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

  function updatePreferences(changes: Partial<UserPreferences>) {
    setPreferences((current) => current ? { ...current, ...changes } : current);
  }

  function updateName(taskId: string, value: string) {
    setGraph((current) =>
      current ? renameTask(current, taskId, value) : current,
    );
  }

  function addChild(parentId: string) {
    const childId = crypto.randomUUID();
    setGraph((current) =>
      current ? addChildTask(current, parentId, childId) : current,
    );
    setSelectedId(childId);
  }

  function addTask() {
    const taskId = crypto.randomUUID();
    setGraph((current) =>
      current ? addTopLevelTask(current, taskId) : current,
    );
    setSelectedId(taskId);
  }

  function collapseAll() {
    if (!graph) return;
    updatePreferences({ collapsedTaskIds: [...getParentTaskIds(graph)] });
  }

  function expandAll() {
    updatePreferences({ collapsedTaskIds: [] });
  }

  return (
    <main className="app-shell">
      <AppHeader active="timeline" title="Timeline" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />

      <div className="workspace">
        <section className="timeline-card" aria-labelledby="timeline-heading">
          <div className="timeline-toolbar">
            <div>
              <p className="eyebrow">Project plan</p>
              <h2 id="timeline-heading">{rangeLabel(days[0], days.at(-1)!)}</h2>
              <div className="tree-actions" aria-label="Task hierarchy">
                <button type="button" onClick={collapseAll}>Collapse all</button>
                <button type="button" onClick={expandAll}>Expand all</button>
              </div>
            </div>
            <div className="range-controls" aria-label="Timeline range">
              <label className="done-toggle">
                <input
                  type="checkbox"
                  checked={preferences.hideDone}
                  onChange={(event) =>
                    updatePreferences({ hideDone: event.target.checked })
                  }
                />
                Hide done
              </label>
              <button
                type="button"
                aria-label="Previous four weeks"
                onClick={() => setRangeStart((value) => addDays(value, -28))}
              >
                ←
              </button>
              <button
                type="button"
                className="today-button"
                onClick={() => setRangeStart(addDays(today, -14))}
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Next four weeks"
                onClick={() => setRangeStart((value) => addDays(value, 28))}
              >
                →
              </button>
            </div>
          </div>

          <TimelineGrid
            graph={graph}
            days={days}
            today={today}
            rangeStart={rangeStart}
            selectedId={selectedId}
            hideDone={preferences.hideDone}
            taskColumnWidth={
              preferences.taskColumnWidth ?? DEFAULT_TASK_COLUMN_WIDTH
            }
            collapsedIds={collapsedIds}
            onGraphChange={setGraph}
            onCollapsedIdsChange={(ids) =>
              updatePreferences({ collapsedTaskIds: [...ids] })
            }
            onTaskColumnWidthChange={(taskColumnWidth) =>
              updatePreferences({ taskColumnWidth })
            }
            onSelect={setSelectedId}
            onNameChange={updateName}
            onAddChild={addChild}
            onCreate={addTask}
          />
        </section>

        <TaskInspector
          selectedId={selectedId}
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </main>
  );
}
