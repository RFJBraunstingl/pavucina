import { addDays, isIsoDate } from "@/utils/shared/temporal/date.ts";
import { removeUnusedDates } from "@/services/task/scheduling/dates/task-date-service.ts";
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

function setEventDate(
  graph: Graph,
  eventId: string,
  type: EventDateRelationshipType,
  value: string,
) {
  const existingDate = graph.nodes.find(
    (node) => node.type === "date" && node.properties.value === value,
  );
  const date = existingDate ?? {
    id: crypto.randomUUID(),
    type: "date" as const,
    properties: { value },
  };
  const existingRelationship = graph.relationships.find(
    (relationship) =>
      relationship.sourceId === eventId && relationship.type === type,
  );
  return {
    ...graph,
    nodes: existingDate ? graph.nodes : [...graph.nodes, date],
    relationships: [
      ...graph.relationships.filter(
        (relationship) =>
          relationship.sourceId !== eventId || relationship.type !== type,
      ),
      {
        id: existingRelationship?.id ?? crypto.randomUUID(),
        type,
        sourceId: eventId,
        targetId: date.id,
      },
    ],
  };
}

export function setEventDates(
  graph: Graph,
  eventId: string,
  startDate: string,
  endDate: string,
) {
  const withStart = setEventDate(
    graph,
    eventId,
    "eventStartDate",
    startDate,
  );
  return removeUnusedDates(
    setEventDate(withStart, eventId, "eventEndDate", endDate),
  );
}
