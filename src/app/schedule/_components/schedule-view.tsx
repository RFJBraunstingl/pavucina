"use client";

import { useMemo, useRef, useState } from "react";

import ScheduleGrid from "./schedule-grid";
import ScheduleTray from "./schedule-tray";
import { useScheduleDayCount } from "./use-schedule-day-count";
import { useTraySchedule } from "./use-tray-schedule";
import AppHeader from "../../_components/app-header";
import { GraphLoading, GraphSyncError } from "../../_components/graph-state";
import TaskInspector from "../../_components/task-inspector";
import { usePreferences } from "../../_components/use-preferences";
import { useGraph } from "@/providers/graph-provider";
import {
  getDaySchedule,
  getOverdueTasks,
  scheduleTaskForDay,
} from "@/services/task-day-schedule-service";
import { resolvedScheduleMode } from "@/services/preferences-service";
import {
  addDays,
  compactDateLabel,
  makeDateRange,
  rangeLabel,
} from "@/utils/date";
import type { UserPreferences } from "@/types/preferences";

export default function ScheduleView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();
  const {
    preferences,
    setPreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();
  const [day, setDay] = useState(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState(today);
  const body = useRef<HTMLDivElement>(null);
  const dayCount = useScheduleDayCount();
  const days = useMemo(() => makeDateRange(day, dayCount), [day, dayCount]);
  const scheduleMode = preferences ? resolvedScheduleMode(preferences) : "leaf";
  const schedules = useMemo(
    () => days.map((date) => ({
      date,
      ...(graph && preferences
        ? getDaySchedule(graph, date, scheduleMode, preferences.hideDone)
        : { events: [], unscheduled: [] }),
    })),
    [days, graph, preferences, scheduleMode],
  );
  const overdue = useMemo(() => {
    if (!graph) return [];
    const visibleTaskIds = new Set(
      schedules.flatMap(({ events, unscheduled }) => [
        ...events.map(({ task }) => task.id),
        ...unscheduled.map(({ task }) => task.id),
      ]),
    );
    return getOverdueTasks(graph, today, scheduleMode).filter(
      ({ task }) => !visibleTaskIds.has(task.id),
    );
  }, [graph, scheduleMode, schedules, today]);
  const tray = useTraySchedule({
    days,
    bodyRef: body,
    onSelect: selectTask,
    onSchedule: (taskId, date, startTime, endTime) => setGraph((current) =>
      current
        ? scheduleTaskForDay(current, taskId, date, startTime, endTime)
        : current,
    ),
  });

  if (!hydrated || !graph) {
    return <GraphLoading label="Loading schedule…" error={syncError} onRetry={retry} />;
  }
  if (!preferences) {
    return <GraphLoading label="Loading preferences…" error={preferencesError} onRetry={retryPreferences} />;
  }

  function updatePreferences(changes: Partial<UserPreferences>) {
    setPreferences((current) => current ? { ...current, ...changes } : current);
  }

  function selectTask(taskId: string, date: string) {
    setSelectedId(taskId);
    setScheduleDate(date);
  }

  function showDay(date: string) {
    setDay(date);
    setScheduleDate(date);
    setSelectedId(null);
  }

  return (
    <main className="app-shell">
      <AppHeader active="schedule" title="Schedule" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />
      <div className="workspace">
        <section className="calendar-card schedule-card" aria-labelledby="schedule-heading">
          <div className="timeline-toolbar">
            <div>
              <p className="eyebrow">Daily schedule</p>
              <h2 id="schedule-heading">
                {days.length === 1 ? compactDateLabel(day) : rangeLabel(day, days.at(-1)!)}
              </h2>
            </div>
            <div className="range-controls" aria-label="Schedule day">
              <label className="done-toggle">
                <input
                  type="checkbox"
                  checked={preferences.hideDone}
                  onChange={(event) => updatePreferences({ hideDone: event.target.checked })}
                />
                Hide done
              </label>
              <button type="button" aria-label="Previous day" onClick={() => showDay(addDays(day, -1))}>←</button>
              <button type="button" className="today-button" onClick={() => showDay(today)}>Today</button>
              <button type="button" aria-label="Next day" onClick={() => showDay(addDays(day, 1))}>→</button>
            </div>
          </div>
          <p className="calendar-hint">
            Drag a task into the day, or select it to enter exact times.
          </p>
          <ScheduleTray
            days={schedules.map(({ date, unscheduled }) => ({ date, tasks: unscheduled }))}
            overdue={overdue}
            selectedId={selectedId}
            selectedDate={scheduleDate}
            onSelect={selectTask}
            onDragStart={tray.beginDrag}
            onDragMove={tray.continueDrag}
            onDragEnd={tray.endDrag}
            onDragCancel={tray.cancelDrag}
          />
          <ScheduleGrid
            graph={graph}
            scheduleMode={scheduleMode}
            days={days}
            today={today}
            events={schedules.flatMap(({ events }, dayIndex) =>
              events.map((event) => ({ ...event, dayIndex })),
            )}
            selectedId={selectedId}
            bodyRef={body}
            onGraphChange={setGraph}
            onSelect={selectTask}
          />
        </section>
        <TaskInspector
          selectedId={selectedId}
          scheduleMode={scheduleMode}
          scheduleDate={scheduleDate}
          helpText="Move or resize the event in the day, or enter exact times above."
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </main>
  );
}
