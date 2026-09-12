"use client";

import { useMemo, useRef, useState } from "react";

import CalendarControls from "./calendar-controls";
import CalendarEditLock from "./calendar-edit-lock";
import CalendarGrid from "./calendar-grid";
import ScheduleTray from "./schedule-tray";
import { useCalendarDayCount } from "./use-calendar-day-count";
import { useExternalCalendars } from "./use-external-calendars";
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
  startOfWeek,
} from "@/utils/date";
import type { UserPreferences } from "@/types/preferences";

export default function CalendarView() {
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
  const [mobileLocked, setMobileLocked] = useState(true);
  const body = useRef<HTMLDivElement>(null);
  const dayCount = useCalendarDayCount();
  const mobile = dayCount === 1;
  const days = useMemo(
    () => makeDateRange(mobile ? day : startOfWeek(day), dayCount), [day, dayCount, mobile]);
  const scheduleMode = preferences ? resolvedScheduleMode(preferences) : "leaf";
  const schedules = useMemo(
    () => graph && preferences
      ? days.map((date) => ({
          date,
          ...getDaySchedule(graph, date, scheduleMode, preferences.hideDone),
        }))
      : [],
    [days, graph, preferences, scheduleMode],
  );
  const taskEvents = useMemo(
    () => schedules.flatMap(({ events }, dayIndex) =>
      events.map((event) => ({ ...event, dayIndex }))),
    [schedules],
  );
  const overdue = useMemo(() => {
    if (!graph) return [];
    const visible = new Set(schedules.flatMap(({ events, unscheduled }) => [
      ...events.map(({ task }) => task.id),
      ...unscheduled.map(({ task }) => task.id),
    ]));
    return getOverdueTasks(graph, today, scheduleMode).filter(
      ({ task }) => !visible.has(task.id),
    );
  }, [graph, scheduleMode, schedules, today]);
  const calendars = useExternalCalendars(days);
  const locked = mobile && mobileLocked;
  const tray = useTraySchedule({
    days,
    bodyRef: body,
    locked,
    onSelect: selectTask,
    onSchedule: (taskId, date, startTime, endTime) => setGraph((current) =>
      current
        ? scheduleTaskForDay(current, taskId, date, startTime, endTime)
        : current,
    ),
  });

  if (!hydrated || !graph) {
    return <GraphLoading label="Loading calendar…" error={syncError} onRetry={retry} />;
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
      <AppHeader active="calendar" title="Calendar" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />
      <GraphSyncError error={calendars.error} onRetry={() => void calendars.refresh()} />
      <div className="workspace">
        <section className="calendar-card" aria-labelledby="calendar-heading">
          <div className="timeline-toolbar">
            <div>
              <p className="eyebrow">{mobile ? "Daily plan" : "Weekly plan"}</p>
              <h2 id="calendar-heading">
                {mobile ? compactDateLabel(day) : rangeLabel(days[0], days[6])}
              </h2>
            </div>
            <div className="calendar-toolbar-actions">
              <CalendarControls calendars={calendars} />
              <div className="range-controls" aria-label="Calendar range">
                <label className="done-toggle">
                  <input
                    type="checkbox"
                    checked={preferences.hideDone}
                    onChange={(event) =>
                      updatePreferences({ hideDone: event.target.checked })
                    }
                  />
                  Hide done
                </label>
                {mobile && (
                  <CalendarEditLock locked={mobileLocked} onToggle={() =>
                    setMobileLocked((current) => !current)} />
                )}
                <button
                  type="button"
                  aria-label={`Previous ${mobile ? "day" : "week"}`}
                  onClick={() => showDay(addDays(day, -dayCount))}
                >←</button>
                <button type="button" className="today-button" onClick={() => showDay(today)}>Today</button>
                <button
                  type="button"
                  aria-label={`Next ${mobile ? "day" : "week"}`}
                  onClick={() => showDay(addDays(day, dayCount))}
                >→</button>
              </div>
            </div>
          </div>
          <p className="calendar-hint">
            {locked
              ? "Editing is locked. Unlock to drag or resize tasks."
              : "Drag tasks into the calendar, or drag an edge to resize them."}
          </p>
          <ScheduleTray
            days={schedules.map(({ date, unscheduled }) => ({
              date,
              tasks: unscheduled,
            }))}
            overdue={overdue}
            selectedId={selectedId}
            selectedDate={scheduleDate}
            locked={locked}
            onSelect={selectTask}
            onDragStart={tray.beginDrag}
            onDragMove={tray.continueDrag}
            onDragEnd={tray.endDrag}
            onDragCancel={tray.cancelDrag}
          />
          <CalendarGrid
            graph={graph}
            scheduleMode={scheduleMode}
            days={days}
            today={today}
            taskEvents={taskEvents}
            externalEvents={calendars.data?.events ?? []}
            selectedId={selectedId}
            locked={locked}
            bodyRef={body}
            onGraphChange={setGraph}
            onSelect={selectTask}
          />
        </section>
        <TaskInspector
          selectedId={selectedId}
          scheduleMode={scheduleMode}
          scheduleDate={scheduleDate}
          helpText="Move or resize the event, or enter exact times above."
          onDeleted={() => setSelectedId(null)}
        />
      </div>
    </main>
  );
}
