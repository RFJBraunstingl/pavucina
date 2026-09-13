import { useMemo } from "react";

import {
  getDaySchedule,
  getOverdueTasks,
} from "@/services/task-day-schedule-service";
import { resolvedScheduleMode } from "@/services/preferences-service";
import type { CalendarConnectionSummary } from "@/types/external-calendar";
import type { EventNode } from "@/types/event";
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
  const visibleCalendarKeys = useMemo(() => new Set(
    connections?.flatMap((connection) => connection.calendars.flatMap((calendar) =>
      calendar.selected && calendar.visible
        ? [`${connection.id}:${calendar.id}`]
        : [])) ?? [],
  ), [connections]);
  const importedEvents = useMemo(() => graph?.nodes.filter(
    (node): node is EventNode => node.type === "event" && visibleCalendarKeys.has(
      `${node.properties.externalOrigin.connectionId}:${node.properties.externalOrigin.calendarId}`,
    )) ?? [], [graph, visibleCalendarKeys]);

  return { scheduleMode, schedules, taskEvents, overdue, importedEvents };
}
