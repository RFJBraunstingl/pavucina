"use client";

import { useMemo, useRef, useState } from "react";

import CalendarControls from "./navigation/calendar-controls";
import CalendarInspector from "./calendar-inspector";
import CalendarToolbar from "./calendar-toolbar";
import CalendarGrid from "./grid/calendar-grid";
import EventDialog from "./editor/event-dialog";
import ScheduleTray from "./scheduling/schedule-tray";
import { useCalendarDayCount } from "./navigation/use-calendar-day-count";
import { useCalendarItems } from "./grid/use-calendar-items";
import { useExternalCalendars } from "@/app/_components/sync/calendar/use-external-calendars";
import { useTraySchedule } from "./scheduling/use-tray-schedule";
import { useEventEditor } from "./editor/use-event-editor";
import AppHeader from "@/app/_components/common/app-header";
import { GraphLoading, GraphSyncError } from "@/app/_components/sync/graph-state";
import { usePreferences } from "@/app/_components/sync/use-preferences";
import { useGraph } from "@/providers/graph-provider";
import { useCalendarImport } from "@/providers/calendar-import-provider";
import { scheduleTaskForDay } from "@/services/task/scheduling/day/task-day-schedule-service";
import { makeDateRange, startOfWeek } from "@/utils/shared/temporal/date";
import type { UserPreferences } from "@/types/preferences/preferences";

export default function CalendarView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();
  const {
    preferences,
    setPreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();
  const calendarImport = useCalendarImport();
  const [day, setDay] = useState(today);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const eventEditor = useEventEditor(setSelectedId);
  const [scheduleDate, setScheduleDate] = useState(today);
  const [singleDayLocked, setSingleDayLocked] = useState(true);
  const calendarBodyRef = useRef<HTMLDivElement>(null);
  const dayCount = useCalendarDayCount();
  const singleDay = dayCount === 1;
  const days = useMemo(
    () => makeDateRange(singleDay ? day : startOfWeek(day), dayCount),
    [day, dayCount, singleDay],
  );
  const externalCalendars = useExternalCalendars(
    days,
    calendarImport.disconnect,
    !calendarImport.enabled,
  );
  const { scheduleMode, schedules, taskEvents, overdue, graphEvents } =
    useCalendarItems(
      graph,
      preferences,
      days,
      today,
      externalCalendars.data?.connections,
    );
  const locked = singleDay && singleDayLocked;
  const externalEvents = calendarImport.enabled
    ? []
    : externalCalendars.data?.events ?? [];
  const traySchedule = useTraySchedule({
    days,
    bodyRef: calendarBodyRef,
    locked,
    onSelect: selectTask,
    onSchedule: scheduleTask,
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

  function scheduleTask(
    taskId: string,
    date: string,
    startTime: string,
    endTime: string,
  ) {
    setGraph((current) =>
      current
        ? scheduleTaskForDay(current, taskId, date, startTime, endTime)
        : current,
    );
  }

  async function refreshCalendars() {
    if (calendarImport.enabled) await calendarImport.syncNow();
    await externalCalendars.refresh();
  }

  function showDay(date: string) {
    setDay(date);
    setScheduleDate(date);
    setSelectedId(null);
    eventEditor.close();
  }

  return (
    <main className="app-shell">
      <AppHeader active="calendar" title="Calendar" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />
      <GraphSyncError
        error={externalCalendars.error}
        onRetry={() => void externalCalendars.refresh()}
      />
      <GraphSyncError error={calendarImport.error} onRetry={() => void calendarImport.syncNow()} />
      <div className="workspace">
        <section className="calendar-card" aria-labelledby="calendar-heading">
          <CalendarToolbar
            days={days}
            day={day}
            today={today}
            dayCount={dayCount}
            locked={locked}
            hideDone={preferences.hideDone}
            onToggleLock={() => setSingleDayLocked((current) => !current)}
            onHideDone={(hideDone) => updatePreferences({ hideDone })}
            onShowDay={showDay}
            controls={
              <CalendarControls
                calendars={externalCalendars}
                importBusy={calendarImport.busy}
                onRefresh={refreshCalendars}
              />
            }
          />
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
            onDragStart={traySchedule.beginDrag}
            onDragMove={traySchedule.continueDrag}
            onDragEnd={traySchedule.endDrag}
            onDragCancel={traySchedule.cancelDrag}
          />
          <CalendarGrid
            graph={graph}
            scheduleMode={scheduleMode}
            days={days}
            today={today}
            taskEvents={taskEvents}
            externalEvents={externalEvents}
            graphEvents={graphEvents}
            selectedId={selectedId}
            locked={locked}
            bodyRef={calendarBodyRef}
            onGraphChange={setGraph}
            onSelect={selectTask}
            onSelectEvent={eventEditor.select}
            onCreateEvent={eventEditor.create}
            creating={Boolean(eventEditor.draft)}
          />
        </section>
        <CalendarInspector
          graph={graph}
          selectedId={selectedId}
          scheduleMode={scheduleMode}
          scheduleDate={scheduleDate}
          onEditEvent={eventEditor.select}
          onDeleteTask={() => setSelectedId(null)}
        />
      </div>
      {graph && eventEditor.draft && (
        <EventDialog
          key={eventEditor.draft.id}
          draft={eventEditor.draft}
          onSave={eventEditor.save}
          onDelete={eventEditor.remove}
          onClose={eventEditor.close}
        />
      )}
    </main>
  );
}
