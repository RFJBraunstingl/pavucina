"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  addChildTask,
  addDays,
  createSeedGraph,
  daysBetween,
  flattenTasks,
  getTaskDate,
  isGraph,
  makeDateRange,
  moveTask,
  resizeTask,
  setTaskDate,
  setTaskDates,
  todayIso,
  type DateRelationshipType,
  type Graph,
  type TaskNode,
} from "./timeline";

const STORAGE_KEY = "pavucina.graph.v1";
const DAY_WIDTH = 48;
const subscribe = () => () => {};

type DragMode = "move" | "start" | "end";
type DragState = {
  pointerId: number;
  taskId: string;
  mode: DragMode;
  originX: number;
  originGraph: Graph;
  lastAmount: number;
};

function loadGraph(today: string) {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isGraph(parsed)) return parsed;
    }
  } catch {
    // A bad browser value should not prevent the timeline from opening.
  }
  return createSeedGraph(today);
}

const toDate = (value: string) => new Date(`${value}T00:00:00Z`);

function dayLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    timeZone: "UTC",
  }).format(toDate(value));
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    timeZone: "UTC",
  }).format(toDate(value));
}

function rangeLabel(start: string, end: string) {
  const format = new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${format.format(toDate(start))} – ${format.format(toDate(end))}`;
}

function isWeekend(value: string) {
  return [0, 6].includes(toDate(value).getUTCDay());
}

export default function Home() {
  const [today] = useState(todayIso);
  const [graph, setGraph] = useState<Graph | null>(() => loadGraph(today));
  const [rangeStart, setRangeStart] = useState(() => addDays(today, -14));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const drag = useRef<DragState | null>(null);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (hydrated && graph) localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
  }, [graph, hydrated]);

  const days = useMemo(() => makeDateRange(rangeStart), [rangeStart]);
  const tasks = useMemo(() => (graph ? flattenTasks(graph) : []), [graph]);
  const selected = graph?.nodes.find(
    (node): node is TaskNode => node.id === selectedId && node.type === "task",
  );

  if (!hydrated || !graph) {
    return (
      <main className="loading-screen">
        <span className="brand-mark" aria-hidden="true" />
        <p>Loading timeline…</p>
      </main>
    );
  }

  function updateName(taskId: string, value: string) {
    const name = value.trim();
    if (!name) return;
    setGraph((current) =>
      current
        ? {
            ...current,
            nodes: current.nodes.map((node) =>
              node.id === taskId && node.type === "task"
                ? { ...node, properties: { ...node.properties, name } }
                : node,
            ),
          }
        : current,
    );
  }

  function updateDate(taskId: string, type: DateRelationshipType, value: string) {
    setGraph((current) => {
      if (!current) return current;
      if (!value) return setTaskDate(current, taskId, type);

      const otherType =
        type === "plannedStartDate" ? "plannedEndDate" : "plannedStartDate";
      const other = getTaskDate(current, taskId, otherType);
      if (!other) return setTaskDates(current, taskId, value, value);
      if (type === "plannedStartDate" && value > other) {
        return setTaskDates(current, taskId, value, value);
      }
      if (type === "plannedEndDate" && value < other) {
        return setTaskDates(current, taskId, value, value);
      }
      return setTaskDate(current, taskId, type, value);
    });
  }

  function addChild(parentId: string) {
    const childId = crypto.randomUUID();
    setGraph((current) =>
      current ? addChildTask(current, parentId, childId) : current,
    );
    setSelectedId(childId);
  }

  function changeTask(taskId: string, mode: DragMode, amount: number) {
    setGraph((current) => {
      if (!current) return current;
      return mode === "move"
        ? moveTask(current, taskId, amount)
        : resizeTask(current, taskId, mode, amount);
    });
  }

  function beginDrag(
    event: PointerEvent<HTMLButtonElement>,
    taskId: string,
    mode: DragMode,
  ) {
    if (event.button !== 0 || !graph) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      taskId,
      mode,
      originX: event.clientX,
      originGraph: graph,
      lastAmount: 0,
    };
    setSelectedId(taskId);
  }

  function continueDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const amount = Math.round((event.clientX - active.originX) / DAY_WIDTH);
    if (amount === active.lastAmount) return;
    drag.current = { ...active, lastAmount: amount };
    setGraph(
      active.mode === "move"
        ? moveTask(active.originGraph, active.taskId, amount)
        : resizeTask(active.originGraph, active.taskId, active.mode, amount),
    );
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function handleArrow(
    event: KeyboardEvent<HTMLButtonElement>,
    taskId: string,
    mode: DragMode,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    changeTask(taskId, mode, event.key === "ArrowLeft" ? -1 : 1);
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span>Pavucina</span>
        </div>
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Timeline</h1>
        </div>
        <p className="header-note">Plan the work. See the relationships.</p>
      </header>

      <div className="workspace">
        <section className="timeline-card" aria-labelledby="timeline-heading">
          <div className="timeline-toolbar">
            <div>
              <p className="eyebrow">Project plan</p>
              <h2 id="timeline-heading">{rangeLabel(days[0], days.at(-1)!)}</h2>
            </div>
            <div className="range-controls" aria-label="Timeline range">
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

          <div className="timeline-scroll">
            <div className="timeline-grid">
              <div className="timeline-header timeline-row">
                <div className="task-column-heading">Task</div>
                {days.map((day, index) => (
                  <div
                    className={`day-heading ${isWeekend(day) ? "weekend" : ""} ${day === today ? "today" : ""}`}
                    style={{ gridColumn: index + 2 }}
                    key={day}
                  >
                    <span>{dayLabel(day)}</span>
                    <strong>{toDate(day).getUTCDate()}</strong>
                    {(index === 0 || toDate(day).getUTCDate() === 1) && (
                      <small>{monthLabel(day)}</small>
                    )}
                  </div>
                ))}
              </div>

              {tasks.map(({ task, depth }) => {
                const start = getTaskDate(graph, task.id, "plannedStartDate");
                const end = getTaskDate(graph, task.id, "plannedEndDate");
                const startOffset = start ? daysBetween(rangeStart, start) : 0;
                const endOffset = end ? daysBetween(rangeStart, end) : -1;
                const visibleStart = Math.max(0, startOffset);
                const visibleEnd = Math.min(days.length - 1, endOffset);
                const barVisible = Boolean(start && end && visibleStart <= visibleEnd);

                return (
                  <div
                    className={`timeline-row task-row ${selectedId === task.id ? "selected" : ""}`}
                    data-depth={Math.min(depth, 2)}
                    key={task.id}
                  >
                    <div
                      className="task-label"
                      style={{ paddingLeft: `${18 + Math.min(depth, 8) * 20}px` }}
                    >
                      <button
                        type="button"
                        className="task-select"
                        onClick={() => setSelectedId(task.id)}
                      >
                        <span>{task.properties.name}</span>
                      </button>
                      <button
                        type="button"
                        className="add-child"
                        aria-label={`Add child to ${task.properties.name}`}
                        title="Add child task"
                        onClick={() => addChild(task.id)}
                      >
                        +
                      </button>
                    </div>

                    {days.map((day, index) => (
                      <div
                        aria-hidden="true"
                        className={`day-cell ${isWeekend(day) ? "weekend" : ""} ${day === today ? "today" : ""}`}
                        style={{ gridColumn: index + 2 }}
                        key={day}
                      />
                    ))}

                    {barVisible && (
                      <div
                        className="task-bar"
                        style={
                          {
                            gridColumn: `${visibleStart + 2} / span ${visibleEnd - visibleStart + 1}`,
                          } as CSSProperties
                        }
                      >
                        {startOffset >= 0 && (
                          <button
                            type="button"
                            className="resize-handle start"
                            aria-label={`Resize start of ${task.properties.name}`}
                            onPointerDown={(event) => beginDrag(event, task.id, "start")}
                            onPointerMove={continueDrag}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                            onKeyDown={(event) => handleArrow(event, task.id, "start")}
                          />
                        )}
                        <button
                          type="button"
                          className="bar-body"
                          aria-label={`Move ${task.properties.name}`}
                          title={`${task.properties.name}: ${start} to ${end}`}
                          onPointerDown={(event) => beginDrag(event, task.id, "move")}
                          onPointerMove={continueDrag}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                          onKeyDown={(event) => handleArrow(event, task.id, "move")}
                        >
                          <span>{task.properties.name}</span>
                        </button>
                        {endOffset < days.length && (
                          <button
                            type="button"
                            className="resize-handle end"
                            aria-label={`Resize end of ${task.properties.name}`}
                            onPointerDown={(event) => beginDrag(event, task.id, "end")}
                            onPointerMove={continueDrag}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                            onKeyDown={(event) => handleArrow(event, task.id, "end")}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="inspector" aria-labelledby="inspector-heading">
          {selected ? (
            <>
              <p className="eyebrow">Selected task</p>
              <h2 id="inspector-heading">Edit details</h2>
              <label>
                Name
                <input
                  key={selected.id}
                  type="text"
                  defaultValue={selected.properties.name}
                  onBlur={(event) => {
                    if (event.currentTarget.value.trim()) {
                      updateName(selected.id, event.currentTarget.value);
                    } else {
                      event.currentTarget.value = selected.properties.name;
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.currentTarget.blur();
                  }}
                />
              </label>
              <label>
                Planned start
                <input
                  type="date"
                  value={getTaskDate(graph, selected.id, "plannedStartDate") ?? ""}
                  onChange={(event) =>
                    updateDate(selected.id, "plannedStartDate", event.target.value)
                  }
                />
              </label>
              <label>
                Planned end
                <input
                  type="date"
                  value={getTaskDate(graph, selected.id, "plannedEndDate") ?? ""}
                  onChange={(event) =>
                    updateDate(selected.id, "plannedEndDate", event.target.value)
                  }
                />
              </label>
              <div className="inspector-help">
                <span aria-hidden="true">↔</span>
                <p>Drag a bar to move it. Drag either edge to resize by whole days.</p>
              </div>
            </>
          ) : (
            <div className="empty-inspector">
              <span aria-hidden="true">↗</span>
              <h2 id="inspector-heading">Select a task</h2>
              <p>Choose a row or timeline bar to edit its name and planned dates.</p>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
