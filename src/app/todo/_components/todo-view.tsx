"use client";

import AppHeader from "../../_components/app-header";
import { useGraph } from "@/hooks/use-graph";
import { getTasksForDate, setTaskDone } from "@/services/task-service";
import { getTaskDate } from "@/services/task-schedule-service";
import { compactDateLabel } from "@/utils/date";

export default function TodoView() {
  const { graph, setGraph, today, hydrated } = useGraph();

  if (!hydrated || !graph) {
    return <main className="loading-screen"><p>Loading tasks…</p></main>;
  }

  const tasks = getTasksForDate(graph, today);
  const doneCount = tasks.filter((task) => task.properties.done).length;

  function updateDone(taskId: string, done: boolean) {
    setGraph((current) => current ? setTaskDone(current, taskId, done) : current);
  }

  return (
    <main className="app-shell">
      <AppHeader active="todo" title="ToDo" />
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
              const time = task.properties.plannedStartTime;
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
                        {time && <> · <time dateTime={time}>{time}</time></>}
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
