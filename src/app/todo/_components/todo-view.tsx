"use client";

import { useMemo, useState } from "react";

import TodoDetailsDialog from "./todo-details-dialog";
import TodoHeader from "./todo-header";
import TodoListItem from "./todo-list-item";
import AppHeader from "@/app/_components/common/app-header";
import { GraphLoading, GraphSyncError } from "@/app/_components/sync/graph-state";
import { useExternalCalendars } from "@/app/_components/sync/calendar/use-external-calendars";
import { usePreferences } from "@/app/_components/sync/use-preferences";
import { useGraph } from "@/providers/graph-provider";
import { useCalendarImport } from "@/providers/calendar-import-provider";
import { getTodoItemsForDate } from "@/services/todo/todo-service";
import {
  isNodeDone,
  markNodeDone,
  reopenNode,
} from "@/services/event/completion-service";
import type { UserPreferences } from "@/types/preferences/preferences";

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
  const doneCount = items.filter((item) => isNodeDone(graph, item.id)).length;
  const visibleItems = preferences.hideDone
    ? items.filter((item) => !isNodeDone(graph, item.id))
    : items;
  const detailsItem = items.find((item) => item.id === detailsItemId) ?? null;
  const calendarError = calendars.error || calendars.data?.connections
    .map((connection) => connection.error).filter(Boolean).join("; ") || null;
  const loadingEvents = (!calendars.data && !calendarError) ||
    calendars.busy === "refresh" || calendarImport.busy;

  function updateCompletion(itemId: string, done: boolean) {
    setGraph((current) =>
      current
        ? done
          ? reopenNode(current, itemId, today)
          : markNodeDone(current, itemId, today)
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
        <TodoHeader
          date={today}
          doneCount={doneCount}
          itemCount={items.length}
          hideDone={preferences.hideDone}
          showFullTaskPath={preferences.showFullTaskPath ?? false}
          onHideDoneChange={(hideDone) => updatePreferences({ hideDone })}
          onShowFullTaskPathChange={(showFullTaskPath) =>
            updatePreferences({ showFullTaskPath })
          }
        />

        {loadingEvents && (
          <p className="todo-empty" role="status">Loading calendar events…</p>
        )}
        {visibleItems.length > 0 ? (
          <ul className="todo-list">
            {visibleItems.map((item) => (
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
          <p className="todo-empty">
            {items.length > 0
              ? "All tasks and events scheduled for today are done."
              : "No tasks or events are scheduled for today."}
          </p>
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
