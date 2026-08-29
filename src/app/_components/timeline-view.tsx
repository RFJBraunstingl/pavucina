"use client";

import { useMemo, useState } from "react";

import AppHeader from "./app-header";
import TaskInspector from "./task-inspector";
import TimelineGrid from "./timeline-grid";
import { useGraph } from "@/hooks/use-graph";
import { addChildTask, renameTask } from "@/services/task-service";
import { updateTaskDate } from "@/services/task-schedule-service";
import { addDays, makeDateRange, rangeLabel } from "@/utils/date";
import type { DateRelationshipType, TaskNode } from "@/types/graph";

export default function TimelineView() {
  const { graph, setGraph, today, hydrated } = useGraph();
  const [rangeStart, setRangeStart] = useState(() => addDays(today, -14));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const days = useMemo(() => makeDateRange(rangeStart), [rangeStart]);
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
    setGraph((current) =>
      current ? renameTask(current, taskId, value) : current,
    );
  }

  function updateDate(taskId: string, type: DateRelationshipType, value: string) {
    setGraph((current) =>
      current ? updateTaskDate(current, taskId, type, value) : current,
    );
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
      <AppHeader active="timeline" title="Timeline" />

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
