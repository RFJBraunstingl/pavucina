"use client";

import { useMemo, useState } from "react";

import TodoDetailsDialog from "./todo-details-dialog";
import TodoListItem from "./todo-list-item";
import AppHeader from "../../_components/app-header";
import { GraphLoading, GraphSyncError } from "../../_components/graph-state";
import { useExternalCalendars } from "../../_components/use-external-calendars";
import { usePreferences } from "../../_components/use-preferences";
import { useGraph } from "@/providers/graph-provider";
import { useCalendarImport } from "@/providers/calendar-import-provider";
import { getTodoItemsForDate } from "@/services/todo-service";
import {
  isTaskDone,
  markTaskDone,
  reopenTask,
} from "@/services/task-completion-service";
import { compactDateLabel } from "@/utils/date";
import type { UserPreferences } from "@/types/preferences";

export default function TodoView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();
  const [detailsItemId, setDetailsItemId] = useState<string | null>(null);
  const days = useMemo(() => [today], [today]);
  const calendars = useExternalCalendars(days, undefined, false);
  const calendarImport = useCalendarImport();
  const {
    preferences,
    setPreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();

  if (!hydrated || !graph) {
    return (
      <GraphLoading
        label="Loading tasks…"
        error={syncError}
        onRetry={retry}
      />
    );
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

  const items = getTodoItemsForDate(graph, today, calendars.data?.connections);
  const tasks = items.filter((item) => item.type === "task");
  const doneCount = tasks.filter((task) => isTaskDone(graph, task.id)).length;
  const detailsItem = items.find((item) => item.id === detailsItemId) ?? null;
  const calendarError = calendars.error || calendars.data?.connections
    .map((connection) => connection.error).filter(Boolean).join("; ") || null;
  const loadingEvents = (!calendars.data && !calendarError) ||
    calendars.busy === "refresh" || calendarImport.busy;

  function updateCompletion(taskId: string, done: boolean) {
    setGraph((current) =>
      current
        ? done
          ? reopenTask(current, taskId, today)
          : markTaskDone(current, taskId, today)
        : current,
    );
  }

  function updatePreferences(changes: Partial<UserPreferences>) {
    setPreferences((current) =>
      current ? { ...current, ...changes } : current,
    );
  }

  return (
    <main className="app-shell">
      <AppHeader active="todo" title="ToDo" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />
      <GraphSyncError error={calendarError} onRetry={() => void calendars.refresh()} />
      <GraphSyncError error={calendarImport.error} onRetry={() =>
        void calendarImport.syncNow().catch(() => undefined)} />
      <section className="todo-card" aria-labelledby="todo-heading">
        <header className="todo-heading">
          <div>
            <p className="eyebrow">Daily checklist</p>
            <h2 id="todo-heading">
              <time dateTime={today}>{compactDateLabel(today)}</time>
            </h2>
          </div>
          <div className="todo-heading-actions">
            <label className="done-toggle todo-path-toggle">
              <input
                type="checkbox"
                checked={preferences.showFullTaskPath ?? false}
                onChange={(event) =>
                  updatePreferences({ showFullTaskPath: event.target.checked })
                }
              />
              Show full path
            </label>
            <p className="todo-count" aria-live="polite">
              {doneCount} of {tasks.length} done
            </p>
          </div>
        </header>

        {loadingEvents && (
          <p className="todo-empty" role="status">Loading calendar events…</p>
        )}
        {items.length > 0 ? (
          <ul className="todo-list">
            {items.map((item) => (
              <TodoListItem
                key={item.id}
                graph={graph}
                item={item}
                showFullTaskPath={preferences.showFullTaskPath ?? false}
                onDetails={setDetailsItemId}
                onCompletion={updateCompletion}
              />
            ))}
          </ul>
        ) : !loadingEvents && !calendarError && !calendarImport.error && (
          <p className="todo-empty">No tasks or events are scheduled for today.</p>
        )}
      </section>
      <TodoDetailsDialog
        graph={graph}
        item={detailsItem}
        onClose={() => setDetailsItemId(null)}
      />
    </main>
  );
}
