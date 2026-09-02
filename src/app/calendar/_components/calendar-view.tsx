"use client";

import { useMemo, useState } from "react";

import CalendarGrid from "./calendar-grid";
import AppHeader from "../../_components/app-header";
import { GraphLoading, GraphSyncError } from "../../_components/graph-state";
import { useGraph } from "@/providers/graph-provider";
import { addDays, makeDateRange, rangeLabel, startOfWeek } from "@/utils/date";

export default function CalendarView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const days = useMemo(() => makeDateRange(weekStart, 7), [weekStart]);

  if (!hydrated || !graph) {
    return <GraphLoading label="Loading calendar…" error={syncError} onRetry={retry} />;
  }

  return (
    <main className="app-shell">
      <AppHeader active="calendar" title="Calendar" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <section className="calendar-card" aria-labelledby="calendar-heading">
        <div className="timeline-toolbar">
          <div>
            <p className="eyebrow">Weekly schedule</p>
            <h2 id="calendar-heading">{rangeLabel(days[0], days[6])}</h2>
          </div>
          <div className="range-controls" aria-label="Calendar range">
            <button type="button" aria-label="Previous week" onClick={() => setWeekStart((day) => addDays(day, -7))}>←</button>
            <button type="button" className="today-button" onClick={() => setWeekStart(startOfWeek(today))}>Today</button>
            <button type="button" aria-label="Next week" onClick={() => setWeekStart((day) => addDays(day, 7))}>→</button>
          </div>
        </div>
        <p className="calendar-hint">
          Drag tasks between days and times. Drag either edge to change its time.
        </p>
        <CalendarGrid graph={graph} days={days} today={today} onGraphChange={setGraph} />
      </section>
    </main>
  );
}
