"use client";

import AppHeader from "../../_components/app-header";
import { GraphLoading, GraphSyncError } from "../../_components/graph-state";
import { useGraph } from "@/providers/graph-provider";
import { getLeafTasksForDate, setTaskDone } from "@/services/task-service";
import { getTaskDate } from "@/services/task-schedule-service";
import { compactDateLabel } from "@/utils/date";

export default function TodoView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();

  if (!hydrated || !graph) {
    return <GraphLoading label="Loading tasks…" error={syncError} onRetry={retry} />;
  }

  const tasks = getLeafTasksForDate(graph, today);
  const doneCount = tasks.filter((task) => task.properties.done).length;

  function updateDone(taskId: string, done: boolean) {
    setGraph((current) => current ? setTaskDone(current, taskId, done) : current);
  }

  return (
    <main className="app-shell">
      <AppHeader active="todo" title="ToDo" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <section className="todo-card" aria-labelledby="todo-heading">
        <header className="todo-heading">
          <div>
            <p className="eyebrow">Daily checklist</p>
            <h2 id="todo-heading">
              <time dateTime={today}>{compactDateLabel(today)}</time>
            </h2>
          </div>
          <p className="todo-count" aria-live="polite">
            {doneCount} of {tasks.length} done
          </p>
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
                  "plannedEndDate"
              )
              const startTime = task.properties.plannedStartTime;
              const endTime = task.properties.plannedEndTime;
              return (
                <li className={`todo-item${task.properties.done ? " is-done" : ""}`} key={task.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.properties.done ?? false}
                      onChange={(event) => updateDone(task.id, event.target.checked)}
                    />
                    <span className="todo-copy">
                      <strong>{task.properties.name}</strong>
                      <span>
                        <time dateTime={startDate}>{compactDateLabel(startDate)}</time>
                        {startTime && <> · <time dateTime={startTime}>{startTime}</time></>}
                        {' - '}
                        {endDate && <time dateTime={endDate}>{compactDateLabel(endDate)}</time>}
                        {endTime && <> · <time dateTime={endTime}>{endTime}</time></>}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="todo-empty">No tasks are scheduled for today.</p>
        )}
      </section>
    </main>
  );
}
