import { getEventDate } from "./event-schedule-service.ts";
import { removeUnusedDates } from "./task-schedule-service.ts";
import { isIsoDate } from "../utils/date.ts";
import { EVENT_TEXT_LIMITS, isTimeZone } from "../utils/event.ts";
import { isTime, minutesBetweenDateTimes } from "../utils/time.ts";
import { isUuid } from "../utils/id.ts";
import type { EventNode, NativeEventInput } from "../types/event.ts";
import type { Graph } from "../types/graph.ts";

export function validateNativeEvent(input: NativeEventInput) {
  if (!input.name.trim() || input.name.length > EVENT_TEXT_LIMITS.name) {
    throw new Error(`Enter a title of at most ${EVENT_TEXT_LIMITS.name} characters.`);
  }
  if (input.description.length > EVENT_TEXT_LIMITS.description ||
    input.location.length > EVENT_TEXT_LIMITS.location) {
    throw new Error("The description or location is too long.");
  }
  if (!isIsoDate(input.startDate) || !isIsoDate(input.endDate) ||
    !isTime(input.startTime) || !isTime(input.endTime) || !isTimeZone(input.timeZone)) {
    throw new Error("Enter valid dates, times, and a time zone.");
  }
  if (minutesBetweenDateTimes(input.startDate, input.startTime,
    input.endDate, input.endTime) <= 0) {
    throw new Error("The event must end after it starts.");
  }
}

export function nativeEventInput(graph: Graph, event: EventNode): NativeEventInput {
  return {
    name: event.properties.name,
    description: event.properties.description ?? "",
    location: event.properties.location ?? "",
    timeZone: event.properties.timeZone,
    startDate: getEventDate(graph, event.id, "eventStartDate")!,
    endDate: getEventDate(graph, event.id, "eventEndDate")!,
    startTime: event.properties.startTime!,
    endTime: event.properties.endTime!,
  };
}

export function saveNativeEvent(
  graph: Graph, id: string, input: NativeEventInput, creating: boolean,
): Graph {
  validateNativeEvent(input);
  if (!isUuid(id)) throw new Error("Invalid event ID.");
  const existing = graph.nodes.find((node) => node.id === id);
  if (creating ? Boolean(existing) : existing?.type !== "event" ||
    Boolean(existing.properties.externalOrigin)) {
    throw new Error("This event cannot be edited.");
  }
  const event: EventNode = {
    id, type: "event",
    properties: {
      name: input.name.trim(), description: input.description.trim() || undefined,
      location: input.location.trim() || undefined, allDay: false,
      startTime: input.startTime, endTime: input.endTime, timeZone: input.timeZone,
      calendarName: "Pavucina", calendarColor: "#167a54",
    },
  };
  const nodes = creating ? [...graph.nodes, event]
    : graph.nodes.map((node) => node.id === id ? event : node);
  let relationships = [...graph.relationships];
  for (const [type, date] of [
    ["eventStartDate", input.startDate], ["eventEndDate", input.endDate],
  ] as const) {
    let target = nodes.find((node) => node.type === "date" && node.properties.value === date);
    if (!target) {
      target = { id: crypto.randomUUID(), type: "date", properties: { value: date } };
      nodes.push(target);
    }
    const edge = relationships.find((edge) => edge.sourceId === id && edge.type === type);
    relationships = relationships.filter((edge) => edge.sourceId !== id || edge.type !== type);
    relationships.push({ id: edge?.id ?? crypto.randomUUID(), type, sourceId: id, targetId: target.id });
  }
  return removeUnusedDates({ ...graph, nodes, relationships });
}

export function deleteNativeEvent(graph: Graph, id: string): Graph {
  const event = graph.nodes.find((node) => node.id === id);
  if (event?.type !== "event" || event.properties.externalOrigin) return graph;
  return removeUnusedDates({
    ...graph,
    nodes: graph.nodes.filter((node) => node.id !== id),
    relationships: graph.relationships.filter((edge) => edge.sourceId !== id && edge.targetId !== id),
  });
}
