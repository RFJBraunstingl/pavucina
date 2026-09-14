import { useMemo } from "react";

import {
  getDaySchedule,
  getOverdueTasks,
} from "@/services/task-day-schedule-service";
import { isNodeDone } from "@/services/completion-service";
import { resolvedScheduleMode } from "@/services/preferences-service";
import { visibleCalendarEvents } from "@/utils/event-calendar";
import type { CalendarConnectionSummary } from "@/types/external-calendar";
import type { Graph } from "@/types/graph";
import type { UserPreferences } from "@/types/preferences";

export function useCalendarItems(
  graph: Graph | null,
  preferences: UserPreferences | null,
  days: string[],
  today: string,
  connections?: CalendarConnectionSummary[],
) {
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
  const graphEvents = useMemo(
    () => graph
      ? visibleCalendarEvents(graph, connections, preferences?.calendarEventImportEnabled)
        .filter(({ id }) => !preferences?.hideDone || !isNodeDone(graph, id))
      : [],
    [graph, connections, preferences?.calendarEventImportEnabled, preferences?.hideDone]);

  return { scheduleMode, schedules, taskEvents, overdue, graphEvents };
}
