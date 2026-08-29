"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import TaskInspector from "./task-inspector";
import TimelineGrid from "./timeline-grid";
import { loadGraph, saveGraph } from "@/services/graph-store";
import {
  addChildTask,
  getTaskDate,
  setTaskDate,
  setTaskDates,
} from "@/services/task-service";
import { addDays, makeDateRange, rangeLabel, todayIso } from "@/utils/date";
import type {
  DateRelationshipType,
  Graph,
  TaskNode,
} from "@/types/graph";

const subscribe = () => () => {};

export default function TimelineView() {
  const [today] = useState(todayIso);
  const [graph, setGraph] = useState<Graph | null>(() => loadGraph(today));
  const [rangeStart, setRangeStart] = useState(() => addDays(today, -14));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);
  const days = useMemo(() => makeDateRange(rangeStart), [rangeStart]);
  const selected = graph?.nodes.find(
    (node): node is TaskNode => node.id === selectedId && node.type === "task",
  );

  useEffect(() => {
    if (hydrated && graph) saveGraph(graph);
  }, [graph, hydrated]);

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

          <TimelineGrid
            graph={graph}
            days={days}
            today={today}
            rangeStart={rangeStart}
            selectedId={selectedId}
            onGraphChange={setGraph}
            onSelect={setSelectedId}
            onAddChild={addChild}
          />
        </section>

        <TaskInspector
          graph={graph}
          selected={selected}
          onNameChange={updateName}
          onDateChange={updateDate}
        />
      </div>
    </main>
  );
}
