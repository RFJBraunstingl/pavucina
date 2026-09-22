import { getEventDate } from "@/services/event/event-schedule-service.ts";
import { getTaskDate } from "@/services/task/scheduling/task-date-service.ts";
import { getLeafTasksForDate } from "@/services/task/core/task-service.ts";
import { visibleCalendarEvents } from "@/utils/calendar/events/graph-calendar.ts";
import type { CalendarConnectionSummary } from "@/types/calendar/events/external-calendar.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type { TodoItem } from "@/types/timeline/todo.ts";

export function getTodoSchedule(graph: Graph, item: TodoItem) {
  if (item.type === "event") {
    return {
      startDate: getEventDate(graph, item.id, "eventStartDate"),
      endDate: getEventDate(graph, item.id, "eventEndDate"),
      startTime: item.properties.startTime,
      endTime: item.properties.endTime,
      allDay: item.properties.allDay,
    };
  }
  return {
    startDate: getTaskDate(graph, item.id, "plannedStartDate"),
    endDate: getTaskDate(graph, item.id, "plannedEndDate"),
    startTime: item.properties.plannedStartTime,
    endTime: item.properties.plannedEndTime,
    allDay: false,
  };
}

export function getTodoItemsForDate(
  graph: Graph,
  date: string,
  connections: CalendarConnectionSummary[] = [],
): TodoItem[] {
  const items: TodoItem[] = [
    ...getLeafTasksForDate(graph, date),
    ...visibleCalendarEvents(graph, connections, true),
  ];
  return items.map((item) => ({ item, ...getTodoSchedule(graph, item) }))
    .filter(({ item, startDate, endDate, endTime, allDay }) =>
      item.type === "task" || Boolean(
        startDate && endDate && startDate <= date && date <= endDate &&
        (allDay || date !== endDate || endTime !== "00:00" || startDate === date),
      ))
    .map(({ item, startDate, startTime, allDay }) => ({
      item,
      sortTime: allDay ? "" : item.type === "event" && startDate! < date
        ? "00:00" : startTime ?? "24:00",
    }))
    .sort((left, right) => left.sortTime.localeCompare(right.sortTime) ||
      left.item.properties.name.localeCompare(right.item.properties.name))
    .map(({ item }) => item);
}
