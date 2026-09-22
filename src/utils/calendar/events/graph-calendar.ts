import { calendarPosition } from "../calendar.ts";
import { isImportedEvent } from "./event.ts";
import type { EventNode } from "@/types/calendar/events/event.ts";
import type { CalendarConnectionSummary } from "@/types/calendar/events/external-calendar.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type { GraphCalendarItem } from "@/types/calendar/calendar-layout.ts";

export function visibleImportedEvents(
  graph: Graph | null,
  connections: CalendarConnectionSummary[] = [],
) {
  const visibleCalendarKeys = new Set(connections.flatMap((connection) =>
    connection.calendars.flatMap((calendar) => calendar.selected && calendar.visible
      ? [`${connection.id}:${calendar.id}`]
      : [])));
  return graph?.nodes.filter((node): node is EventNode =>
    isImportedEvent(node) && visibleCalendarKeys.has(
      `${node.properties.externalOrigin.connectionId}:${node.properties.externalOrigin.calendarId}`,
    )) ?? [];
}

export function visibleCalendarEvents(
  graph: Graph | null, connections: CalendarConnectionSummary[] = [], includeImported = false,
) {
  const native = graph?.nodes.filter((node): node is EventNode =>
    node.type === "event" && !node.properties.externalOrigin) ?? [];
  return includeImported ? [...native, ...visibleImportedEvents(graph, connections)] : native;
}

function eventDates(graph: Graph) {
  const dateValues = new Map(graph.nodes.flatMap((node) => node.type === "date"
    ? [[node.id, node.properties.value] as const]
    : []));
  const ranges = new Map<string, { start?: string; end?: string }>();
  for (const edge of graph.relationships) {
    if (edge.type !== "eventStartDate" && edge.type !== "eventEndDate") continue;
    const value = dateValues.get(edge.targetId);
    if (!value) continue;
    const range = ranges.get(edge.sourceId) ?? {};
    if (edge.type === "eventStartDate") range.start = value;
    else range.end = value;
    ranges.set(edge.sourceId, range);
  }
  return ranges;
}

export function graphCalendarItems(
  graph: Graph,
  events: EventNode[],
  days: string[],
) {
  const ranges = eventDates(graph);
  return events.flatMap((event): GraphCalendarItem[] => {
    const { allDay, startTime, endTime } = event.properties;
    if (allDay || !startTime || !endTime) return [];
    const { start: startDate, end: endDate } = ranges.get(event.id) ?? {};
    if (!startDate || !endDate) return [];
    return days.flatMap((day) => {
      if (day < startDate || day > endDate) return [];
      if (day > startDate && day === endDate && endTime === "00:00") {
        return [];
      }
      const visibleStart = day === startDate ? startTime : "00:00";
      const visibleEnd = day === endDate ? endTime : "00:00";
      const position = calendarPosition(
        `${event.id}:${day}`,
        day,
        day === endDate ? day : endDate,
        visibleStart,
        visibleEnd,
        days[0],
      );
      return position ? [{ ...position, eventNode: event }] : [];
    });
  });
}

export function importedAllDayEvents(
  graph: Graph,
  events: EventNode[],
  day: string,
) {
  const ranges = eventDates(graph);
  return events.filter((event) => {
    if (!event.properties.allDay) return false;
    const { start, end } = ranges.get(event.id) ?? {};
    return Boolean(start && end && start <= day && day <= end);
  });
}
