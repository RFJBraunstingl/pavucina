import { addDays, isIsoDate } from "@/utils/shared/temporal/date.ts";
import type { ExternalCalendarEvent } from "@/types/calendar/events/external-calendar.ts";
import type { DateNode, EventDateRelationshipType, Graph } from "@/types/graph/graph.ts";

function zonedDateTime(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export function importedEventSchedule(
  event: ExternalCalendarEvent,
  timeZone: string,
) {
  if (event.allDay) {
    if (isIsoDate(event.start) && isIsoDate(event.end)) {
      return { startDate: event.start, endDate: addDays(event.end, -1) };
    }
    return {
      startDate: zonedDateTime(event.start, timeZone).date,
      endDate: zonedDateTime(
        new Date(Date.parse(event.end) - 1).toISOString(),
        timeZone,
      ).date,
    };
  }
  const start = zonedDateTime(event.start, timeZone);
  const end = zonedDateTime(event.end, timeZone);
  return {
    startDate: start.date,
    endDate: end.date,
    startTime: start.time,
    endTime: end.time,
  };
}

export function getEventDate(
  graph: Graph,
  eventId: string,
  type: EventDateRelationshipType,
) {
  const relationship = graph.relationships.find(
    (item) => item.sourceId === eventId && item.type === type,
  );
  return graph.nodes.find(
    (node): node is DateNode =>
      node.type === "date" && node.id === relationship?.targetId,
  )?.properties.value;
}
