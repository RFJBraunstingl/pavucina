import { removeUnusedDates } from "@/services/task/scheduling/dates/task-date-service.ts";
import { importedEventSchedule } from "../event-schedule-service.ts";
import { importedEventProperties } from "./event-import-properties.ts";
import {
  calendarEventOriginKey,
  isImportedEvent,
} from "@/utils/calendar/events/event.ts";
import type { ImportedEventNode } from "@/types/calendar/events/event.ts";
import type {
  CalendarSyncBatch,
  ExternalCalendarEvent,
} from "@/types/calendar/events/external-calendar.ts";
import type { Graph, Relationship } from "@/types/graph/graph.ts";

export function upsertImportedEvents(
  graph: Graph,
  batch: CalendarSyncBatch,
  events: ExternalCalendarEvent[],
  timeZone: string,
) {
  const nodes = [...graph.nodes];
  const nodeIndexes = new Map(nodes.map((node, index) => [node.id, index]));
  const eventsByOrigin = new Map(nodes.flatMap((node) =>
    isImportedEvent(node)
      ? [[calendarEventOriginKey(node.properties.externalOrigin), node] as const]
      : []));
  const datesByValue = new Map(nodes.flatMap((node) =>
    node.type === "date" ? [[node.properties.value, node] as const] : []));
  const dateValuesById = new Map(nodes.flatMap((node) =>
    node.type === "date" ? [[node.id, node.properties.value] as const] : []));
  const dateEdgesByEvent = new Map<string, Relationship>(
    graph.relationships.flatMap((relationship) =>
      relationship.type === "eventStartDate" ||
      relationship.type === "eventEndDate"
        ? [[`${relationship.sourceId}:${relationship.type}`, relationship] as const]
        : []),
  );
  const replacedEdgeIds = new Set<string>();
  const newDateEdges: Relationship[] = [];

  function upsertEventNode(event: ExternalCalendarEvent) {
    const properties = importedEventProperties(batch, event, timeZone);
    const originKey = calendarEventOriginKey(properties.externalOrigin);
    const existing = eventsByOrigin.get(originKey);
    const node: ImportedEventNode = {
      id: existing?.id ?? crypto.randomUUID(),
      type: "event",
      properties,
    };
    if (existing) {
      const existingIndex = nodeIndexes.get(existing.id);
      if (existingIndex === undefined) {
        throw new Error("Imported event index is inconsistent");
      }
      nodes[existingIndex] = node;
    } else {
      nodeIndexes.set(node.id, nodes.length);
      nodes.push(node);
      eventsByOrigin.set(originKey, node);
    }
    return node;
  }

  function dateNodeId(value: string) {
    const existing = datesByValue.get(value);
    if (existing) return existing.id;
    const dateNode = {
      id: crypto.randomUUID(),
      type: "date" as const,
      properties: { value },
    };
    datesByValue.set(value, dateNode);
    dateValuesById.set(dateNode.id, value);
    nodes.push(dateNode);
    return dateNode.id;
  }

  function setEventDate(
    eventId: string,
    type: "eventStartDate" | "eventEndDate",
    value: string,
  ) {
    const edgeKey = `${eventId}:${type}`;
    const currentEdge = dateEdgesByEvent.get(edgeKey);
    if (dateValuesById.get(currentEdge?.targetId ?? "") === value) return;
    if (currentEdge) replacedEdgeIds.add(currentEdge.id);
    const edge: Relationship = {
      id: crypto.randomUUID(),
      type,
      sourceId: eventId,
      targetId: dateNodeId(value),
    };
    dateEdgesByEvent.set(edgeKey, edge);
    newDateEdges.push(edge);
  }

  for (const event of events) {
    const node = upsertEventNode(event);
    const schedule = importedEventSchedule(event, timeZone);
    setEventDate(node.id, "eventStartDate", schedule.startDate);
    setEventDate(node.id, "eventEndDate", schedule.endDate);
  }

  return removeUnusedDates({
    ...graph,
    nodes,
    relationships: [
      ...graph.relationships.filter(({ id }) => !replacedEdgeIds.has(id)),
      ...newDateEdges,
    ],
  });
}
