import { getTaskDate } from "../dates/task-date-service.ts";
import { isTaskSchedulable } from "../task-schedule-mode-service.ts";
import { taskDuration } from "./task-day-schedule-service.ts";
import { isNodeDone } from "@/services/event/completion-service.ts";
import { flattenTasks } from "@/services/task/core/task-service.ts";
import { layoutCalendarItems } from "@/utils/calendar/calendar-layout.ts";
import { dayScheduleItem } from "@/utils/calendar/day-schedule.ts";
import type { DaySchedule } from "@/types/calendar/events/schedule.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type { ScheduleMode } from "@/types/preferences/preferences.ts";

export function getDaySchedule(
  graph: Graph,
  date: string,
  scheduleMode: ScheduleMode,
  hideDone: boolean,
): DaySchedule {
  const events = [];
  const unscheduled = [];
  for (const { task } of flattenTasks(graph)) {
    if (!isTaskSchedulable(graph, task.id, scheduleMode)) continue;
    if (hideDone && isNodeDone(graph, task.id)) continue;
    const startDate = getTaskDate(graph, task.id, "plannedStartDate");
    const endDate = getTaskDate(graph, task.id, "plannedEndDate");
    if (!startDate || !endDate || date < startDate || date > endDate) continue;
    const { plannedStartTime, plannedEndTime } = task.properties;
    const duration = taskDuration(task);
    if (
      startDate === date &&
      endDate === date &&
      plannedStartTime &&
      plannedEndTime &&
      duration
    ) {
      events.push(dayScheduleItem(
        task,
        date,
        plannedStartTime,
        plannedEndTime,
      ));
    } else {
      unscheduled.push({ task, startDate, endDate });
    }
  }
  return { events: layoutCalendarItems(events), unscheduled };
}

export function getOverdueTasks(
  graph: Graph,
  today: string,
  scheduleMode: ScheduleMode,
) {
  return flattenTasks(graph)
    .flatMap(({ task }) => {
      if (
        isNodeDone(graph, task.id) ||
        !isTaskSchedulable(graph, task.id, scheduleMode)
      ) {
        return [];
      }
      const startDate = getTaskDate(graph, task.id, "plannedStartDate");
      const endDate = getTaskDate(graph, task.id, "plannedEndDate");
      return startDate && endDate && endDate < today
        ? [{ task, startDate, endDate }]
        : [];
    })
    .sort(
      (left, right) =>
        left.endDate.localeCompare(right.endDate) ||
        left.task.properties.name.localeCompare(right.task.properties.name),
    );
}

export function getLeafTasksForDate(graph: Graph, date: string) {
  const parentIds = new Set(
    graph.relationships
      .filter((relationship) => relationship.type === "child")
      .map((relationship) => relationship.sourceId),
  );
  return flattenTasks(graph)
    .map(({ task }) => task)
    .filter((task) => {
      const start = getTaskDate(graph, task.id, "plannedStartDate");
      const end = getTaskDate(graph, task.id, "plannedEndDate") ?? start;
      return Boolean(
        !parentIds.has(task.id) && start && end && start <= date && date <= end,
      );
    })
    .sort(
      (left, right) =>
        (left.properties.plannedStartTime ?? "24:00").localeCompare(
          right.properties.plannedStartTime ?? "24:00",
        ) || left.properties.name.localeCompare(right.properties.name),
    );
}
