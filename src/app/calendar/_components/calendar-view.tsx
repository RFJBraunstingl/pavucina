"use client";

import { useMemo, useRef, useState } from "react";

import CalendarControls from "./navigation/calendar-controls";
import CalendarToolbar from "./calendar-toolbar";
import CalendarGrid from "./grid/calendar-grid";
import EventDialog from "./editor/event-dialog";
import EventInspector from "./editor/event-inspector";
import ScheduleTray from "./scheduling/schedule-tray";
import { useCalendarDayCount } from "./navigation/use-calendar-day-count";
import { useCalendarItems } from "./grid/use-calendar-items";
import { useExternalCalendars } from "@/app/_components/sync/use-external-calendars";
import { useTraySchedule } from "./scheduling/use-tray-schedule";
import { useEventEditor } from "./editor/use-event-editor";
import AppHeader from "@/app/_components/common/app-header";
import { GraphLoading, GraphSyncError } from "@/app/_components/sync/graph-state";
import TaskInspector from "@/app/_components/task/task-inspector";
import { usePreferences } from "@/app/_components/sync/use-preferences";
import { useGraph } from "@/providers/graph-provider";
import { useCalendarImport } from "@/providers/calendar-import-provider";
import { scheduleTaskForDay } from "@/services/task/scheduling/day/task-day-schedule-service";
import { makeDateRange, startOfWeek } from "@/utils/shared/date";
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
  const editor = useEventEditor(setSelectedId);
  const [scheduleDate, setScheduleDate] = useState(today);
  const [mobileLocked, setMobileLocked] = useState(true);
  const body = useRef<HTMLDivElement>(null);
  const dayCount = useCalendarDayCount();
  const mobile = dayCount === 1;
  const days = useMemo(
    () => makeDateRange(mobile ? day : startOfWeek(day), dayCount), [day, dayCount, mobile]);
  const calendars = useExternalCalendars(
    days,
    calendarImport.disconnect,
    !calendarImport.enabled,
  );
  const { scheduleMode, schedules, taskEvents, overdue, graphEvents } =
    useCalendarItems(graph, preferences, days, today, calendars.data?.connections);
  const selectedEvent = graph?.nodes.find((node) => node.id === selectedId);
  const locked = mobile && mobileLocked;
  const externalEvents = calendarImport.enabled ? [] : calendars.data?.events ?? [];
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
    editor.close();
  }

  return (
    <main className="app-shell">
      <AppHeader active="calendar" title="Calendar" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />
      <GraphSyncError error={calendars.error} onRetry={() => void calendars.refresh()} />
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
            onToggleLock={() => setMobileLocked((current) => !current)}
            onHideDone={(hideDone) => updatePreferences({ hideDone })}
            onShowDay={showDay}
            controls={
              <CalendarControls
                calendars={calendars}
                importBusy={calendarImport.busy}
                onRefresh={async () => {
                  if (calendarImport.enabled) await calendarImport.syncNow();
                  await calendars.refresh();
                }}
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
            externalEvents={externalEvents}
            graphEvents={graphEvents}
            selectedId={selectedId}
            locked={locked}
            bodyRef={body}
            onGraphChange={setGraph}
            onSelect={selectTask}
            onSelectEvent={editor.select}
            onCreateEvent={editor.create}
            creating={Boolean(editor.draft)}
          />
        </section>
        {selectedEvent?.type === "event" ? (
          <EventInspector
            graph={graph}
            event={selectedEvent}
            onEdit={() => editor.select(selectedEvent.id)}
          />
        ) : (
          <TaskInspector
            selectedId={selectedId}
            scheduleMode={scheduleMode}
            scheduleDate={scheduleDate}
            helpText="Move or resize the event, or enter exact times above."
            onDeleted={() => setSelectedId(null)}
          />
        )}
      </div>
      {graph && editor.draft && (
        <EventDialog key={editor.draft.id} draft={editor.draft}
          onSave={editor.save} onDelete={editor.remove} onClose={editor.close} />
      )}
    </main>
  );
}
