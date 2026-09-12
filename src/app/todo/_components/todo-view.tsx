"use client";

import { useState } from "react";

import TaskDetailsDialog from "./task-details-dialog";
import AppHeader from "../../_components/app-header";
import { GraphLoading, GraphSyncError } from "../../_components/graph-state";
import { usePreferences } from "../../_components/use-preferences";
import { useGraph } from "@/providers/graph-provider";
import {
  getLeafTasksForDate,
  getParentTaskNames,
} from "@/services/task-service";
import {
  isTaskDone,
  markTaskDone,
  reopenTask,
} from "@/services/task-completion-service";
import { getTaskDate } from "@/services/task-schedule-service";
import { compactDateLabel } from "@/utils/date";
import type { UserPreferences } from "@/types/preferences";

export default function TodoView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();
  const [detailsTaskId, setDetailsTaskId] = useState<string | null>(null);
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

  const tasks = getLeafTasksForDate(graph, today);
  const doneCount = tasks.filter((task) => isTaskDone(graph, task.id)).length;
  const detailsTask = tasks.find((task) => task.id === detailsTaskId) ?? null;

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

        {tasks.length ? (
          <ul className="todo-list">
            {tasks.map((task) => {
              const startDate = getTaskDate(
                graph,
                task.id,
                "plannedStartDate",
              )!;
              const endDate = getTaskDate(
                graph,
                task.id,
                "plannedEndDate",
              );
              const startTime = task.properties.plannedStartTime;
              const endTime = task.properties.plannedEndTime;
              const parentNames = preferences.showFullTaskPath
                ? getParentTaskNames(graph, task.id)
                : [];
              const done = isTaskDone(graph, task.id);
              return (
                <li
                  className={`todo-item${done ? " is-done" : ""}`}
                  key={task.id}
                >
                  <span className="todo-copy">
                    {parentNames.length > 0 && (
                      <span className="todo-path">
                        {parentNames.join(" › ")}
                      </span>
                    )}
                    <strong>{task.properties.name}</strong>
                    <span>
                      <time dateTime={startDate}>
                        {compactDateLabel(startDate)}
                      </time>
                      {startTime && (
                        <> · <time dateTime={startTime}>{startTime}</time></>
                      )}
                      {" - "}
                      {endDate && (
                        <time dateTime={endDate}>
                          {compactDateLabel(endDate)}
                        </time>
                      )}
                      {endTime && (
                        <> · <time dateTime={endTime}>{endTime}</time></>
                      )}
                    </span>
                  </span>
                  <span className="todo-actions">
                    <button
                      type="button"
                      className="todo-details-button"
                      aria-label={`Show details for ${task.properties.name}`}
                      title="Show task details"
                      onClick={() => setDetailsTaskId(task.id)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 11v6m0-9h.01" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`completion-button${done ? " is-reopen" : ""}`}
                      onClick={() => updateCompletion(task.id, done)}
                    >
                      {done ? "Reopen" : "Mark as done"}
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="todo-empty">No tasks are scheduled for today.</p>
        )}
      </section>
      <TaskDetailsDialog
        graph={graph}
        task={detailsTask}
        onClose={() => setDetailsTaskId(null)}
      />
    </main>
  );
}
