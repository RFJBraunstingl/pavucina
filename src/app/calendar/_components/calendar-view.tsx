"use client";

import CalendarControls from "./navigation/calendar-controls";
import CalendarInspector from "./calendar-inspector";
import CalendarToolbar from "./calendar-toolbar";
import CalendarGrid from "./grid/calendar-grid";
import EventDialog from "./editor/event-dialog";
import ScheduleTray from "./scheduling/schedule-tray";
import { useCalendarItems } from "./grid/use-calendar-items";
import { useExternalCalendars } from "@/app/_components/sync/calendar/use-external-calendars";
import { useEventEditor } from "./editor/use-event-editor";
import { useCalendarRange } from "./state/use-calendar-range";
import { useCalendarTaskScheduling } from "./state/use-calendar-task-scheduling";
import AppHeader from "@/app/_components/common/app-header";
import { GraphLoading, GraphSyncError } from "@/app/_components/sync/graph-state";
import { usePreferences } from "@/app/_components/sync/use-preferences";
import { useGraph } from "@/providers/graph-provider";
import { useCalendarImport } from "@/providers/calendar-import-provider";

export default function CalendarView() {
  const { graph, setGraph, today, hydrated, syncError, retry } = useGraph();
  const {
    preferences,
    patchPreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();
  const calendarImport = useCalendarImport();
  const range = useCalendarRange(today);
  const taskScheduling = useCalendarTaskScheduling({
    today,
    days: range.days,
    locked: range.locked,
    onGraphChange: setGraph,
  });
  const eventEditor = useEventEditor(taskScheduling.setSelectedId);
  const externalCalendars = useExternalCalendars(
    range.days,
    calendarImport.disconnect,
    !calendarImport.enabled,
  );
  const { scheduleMode, schedules, taskEvents, overdue, graphEvents } =
    useCalendarItems(
      graph,
      preferences,
      range.days,
      today,
      externalCalendars.data?.connections,
    );
  const externalEvents = calendarImport.enabled
    ? []
    : externalCalendars.data?.events ?? [];

  if (!hydrated || !graph) {
    return <GraphLoading label="Loading calendar…" error={syncError} onRetry={retry} />;
  }
  if (!preferences) {
    return <GraphLoading label="Loading preferences…" error={preferencesError} onRetry={retryPreferences} />;
  }

  async function refreshCalendars() {
    if (calendarImport.enabled) await calendarImport.syncNow();
    await externalCalendars.refresh();
  }

  function showDay(date: string) {
    range.setDay(date);
    taskScheduling.showDate(date);
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
            days={range.days}
            day={range.day}
            today={today}
            dayCount={range.dayCount}
            locked={range.locked}
            hideDone={preferences.hideDone}
            onToggleLock={range.toggleLock}
            onHideDone={(hideDone) => patchPreferences({ hideDone })}
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
            selectedId={taskScheduling.selectedId}
            selectedDate={taskScheduling.scheduleDate}
            locked={range.locked}
            onSelect={taskScheduling.selectTask}
            onDragStart={taskScheduling.tray.beginDrag}
            onDragMove={taskScheduling.tray.continueDrag}
            onDragEnd={taskScheduling.tray.endDrag}
            onDragCancel={taskScheduling.tray.cancelDrag}
          />
          <CalendarGrid
            graph={graph}
            scheduleMode={scheduleMode}
            days={range.days}
            today={today}
            taskEvents={taskEvents}
            externalEvents={externalEvents}
            graphEvents={graphEvents}
            selectedId={taskScheduling.selectedId}
            locked={range.locked}
            bodyRef={taskScheduling.bodyRef}
            onGraphChange={setGraph}
            onSelect={taskScheduling.selectTask}
            onSelectEvent={eventEditor.select}
            onCreateEvent={eventEditor.create}
            creating={Boolean(eventEditor.draft)}
          />
        </section>
        <CalendarInspector
          graph={graph}
          selectedId={taskScheduling.selectedId}
          scheduleMode={scheduleMode}
          scheduleDate={taskScheduling.scheduleDate}
          onEditEvent={eventEditor.select}
          onDeleteTask={() => taskScheduling.setSelectedId(null)}
        />
      </div>
      {eventEditor.draft && (
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
