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
  deleteTask,
  renameTask,
  setTaskDescription,
  setTaskDone,
  setTaskTime,
} from "@/services/task-service";
import { updateTaskDate } from "@/services/task-schedule-service";
import { addDays, makeDateRange, rangeLabel } from "@/utils/date";
import type { DateRelationshipType, TaskNode, TimeProperty } from "@/types/graph";
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
  const selected = graph?.nodes.find(
    (node): node is TaskNode => node.id === selectedId && node.type === "task",
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

  function updateDone(taskId: string, done: boolean) {
    setGraph((current) =>
      current ? setTaskDone(current, taskId, done) : current,
    );
  }

  function updateDescription(taskId: string, value: string) {
    setGraph((current) =>
      current ? setTaskDescription(current, taskId, value) : current,
    );
  }

  function updateDate(taskId: string, type: DateRelationshipType, value: string) {
    setGraph((current) =>
      current ? updateTaskDate(current, taskId, type, value) : current,
    );
  }

  function updateTime(taskId: string, type: TimeProperty, value: string) {
    setGraph((current) =>
      current ? setTaskTime(current, taskId, type, value) : current,
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

  function removeTask(taskId: string) {
    setGraph((current) => (current ? deleteTask(current, taskId) : current));
    setSelectedId(null);
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
            </div>
            <div className="range-controls" aria-label="Timeline controls">
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
            collapsedIds={collapsedIds}
            onGraphChange={setGraph}
            onCollapsedIdsChange={(ids) =>
              updatePreferences({ collapsedTaskIds: [...ids] })
            }
            onSelect={setSelectedId}
            onNameChange={updateName}
            onAddChild={addChild}
            onCreate={addTask}
          />
        </section>

        <TaskInspector
          graph={graph}
          selected={selected}
          onDelete={removeTask}
          onDoneChange={updateDone}
          onDescriptionChange={updateDescription}
          onNameChange={updateName}
          onDateChange={updateDate}
          onTimeChange={updateTime}
        />
      </div>
    </main>
  );
}
