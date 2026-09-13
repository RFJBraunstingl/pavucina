import { removeUnusedDates } from "./task-schedule-service.ts";
import { importedEventSchedule } from "./event-schedule-service.ts";
import { calendarEventOriginKey, EVENT_TEXT_LIMITS, isImportedEvent } from "../utils/event.ts";
import type { ImportedEventNode } from "../types/event.ts";
import type { CalendarSyncBatch, ExternalCalendarEvent } from "../types/external-calendar.ts";
import type { DateNode, Graph, Relationship } from "../types/graph.ts";

export { getEventDate } from "./event-schedule-service.ts";

function clipped(value: string | undefined, limit: number) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, limit) : undefined;
}

export function removeImportedEvents(
  graph: Graph,
  remove: (event: ImportedEventNode) => boolean = () => true,
) {
  const ids = new Set(graph.nodes.flatMap((node) =>
    isImportedEvent(node) && remove(node) ? [node.id] : []));
  if (!ids.size) return graph;
  return removeUnusedDates({
    ...graph,
    nodes: graph.nodes.filter((node) => !ids.has(node.id)),
    relationships: graph.relationships.filter(
      (edge) => !ids.has(edge.sourceId) && !ids.has(edge.targetId),
    ),
  });
}

function eventProperties(
  batch: CalendarSyncBatch,
  event: ExternalCalendarEvent,
  timeZone: string,
): ImportedEventNode["properties"] {
  const schedule = importedEventSchedule(event, timeZone);
  return {
    name: clipped(event.title, EVENT_TEXT_LIMITS.name) ?? "(Busy)",
    description: clipped(event.description, EVENT_TEXT_LIMITS.description),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    location: clipped(event.location, EVENT_TEXT_LIMITS.location),
    allDay: event.allDay,
    timeZone,
    calendarName: clipped(batch.calendar.name, EVENT_TEXT_LIMITS.calendarName)!,
    calendarColor: batch.calendar.color,
    sourceUrl: clipped(event.url, EVENT_TEXT_LIMITS.sourceUrl),
    providerUpdatedAt: event.providerUpdatedAt,
    externalOrigin: {
      kind: "calendar",
      source: batch.source,
      connectionId: batch.connectionId,
      calendarId: batch.calendar.id,
      eventId: event.id,
    },
  };
}

function upsertEvents(
  graph: Graph,
  batch: CalendarSyncBatch,
  events: ExternalCalendarEvent[],
  timeZone: string,
) {
  const nodes = [...graph.nodes];
  const nodeIndex = new Map(nodes.map((node, index) => [node.id, index]));
  const existingEvents = new Map(nodes.flatMap((node) => isImportedEvent(node)
    ? [[calendarEventOriginKey(node.properties.externalOrigin), node] as const]
    : []));
  const dates = new Map(nodes.flatMap((node) => node.type === "date"
    ? [[node.properties.value, node] as const]
    : []));
  const dateValues = new Map(nodes.flatMap((node) => node.type === "date"
    ? [[node.id, node.properties.value] as const]
    : []));
  const dateEdges = new Map<string, Relationship>(graph.relationships.flatMap((edge) =>
    edge.type === "eventStartDate" || edge.type === "eventEndDate"
      ? [[`${edge.sourceId}:${edge.type}`, edge] as const]
      : []));
  const replacedEdgeIds = new Set<string>();
  const addedEdges: Relationship[] = [];

  for (const event of events) {
    const properties = eventProperties(batch, event, timeZone);
    const originKey = calendarEventOriginKey(properties.externalOrigin);
    const existing = existingEvents.get(originKey);
    const node: ImportedEventNode = {
      id: existing?.id ?? crypto.randomUUID(),
      type: "event",
      properties,
    };
    if (existing) nodes[nodeIndex.get(existing.id)!] = node;
    else {
      nodeIndex.set(node.id, nodes.length);
      nodes.push(node);
      existingEvents.set(originKey, node);
    }

    const schedule = importedEventSchedule(event, timeZone);
    for (const [type, value] of [
      ["eventStartDate", schedule.startDate],
      ["eventEndDate", schedule.endDate],
    ] as const) {
      const edgeKey = `${node.id}:${type}`;
      const currentEdge = dateEdges.get(edgeKey);
      if (dateValues.get(currentEdge?.targetId ?? "") === value) continue;
      if (currentEdge) replacedEdgeIds.add(currentEdge.id);
      let target = dates.get(value);
      if (!target) {
        target = { id: crypto.randomUUID(), type: "date", properties: { value } };
        dates.set(value, target);
        dateValues.set(target.id, value);
        nodes.push(target);
      }
      const edge: Relationship = {
        id: crypto.randomUUID(), type, sourceId: node.id, targetId: target.id,
      };
      dateEdges.set(edgeKey, edge);
      addedEdges.push(edge);
    }
  }
  return removeUnusedDates({
    ...graph,
    nodes,
    relationships: [
      ...graph.relationships.filter(({ id }) => !replacedEdgeIds.has(id)),
      ...addedEdges,
    ],
  });
}

export function reconcileCalendarBatch(
  graph: Graph,
  batch: CalendarSyncBatch,
  timeZone: string,
) {
  const upserts = [...new Map(batch.changes.flatMap((change) =>
    change.action === "upsert" ? [[change.event.id, change.event] as const] : [])).values()];
  const retained = new Set(upserts.map(({ id }) => id));
  const deleted = new Set(batch.changes.flatMap((change) =>
    change.action === "delete" ? [change.eventId] : []));
  const calendarName = clipped(batch.calendar.name, EVENT_TEXT_LIMITS.calendarName)!;
  const metadataUpdated = {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (!isImportedEvent(node)) return node;
      const origin = node.properties.externalOrigin;
      if (origin.connectionId !== batch.connectionId ||
        origin.calendarId !== batch.calendar.id) return node;
      return {
        ...node,
        properties: {
          ...node.properties,
          calendarName,
          calendarColor: batch.calendar.color,
        },
      };
    }),
  };
  const next = removeImportedEvents(metadataUpdated, ({ properties }) => {
    const origin = properties.externalOrigin;
    return origin.connectionId === batch.connectionId &&
      origin.calendarId === batch.calendar.id &&
      (deleted.has(origin.eventId) ||
        (batch.authoritative && !retained.has(origin.eventId)));
  });
  return upsertEvents(next, batch, upserts, timeZone);
}

export function replaceImportedEventSubgraph(current: Graph, remote: Graph) {
  const next = removeImportedEvents(current);
  const events = remote.nodes.filter(isImportedEvent);
  const eventIds = new Set(events.map(({ id }) => id));
  const remoteDates = new Map(remote.nodes.flatMap((node) => node.type === "date"
    ? [[node.id, node] as const]
    : []));
  const localDates = new Map(next.nodes.flatMap((node) => node.type === "date"
    ? [[node.properties.value, node] as const]
    : []));
  const addedDates = new Map<string, DateNode>();
  const eventEdges = remote.relationships.flatMap((edge) => {
    if (!eventIds.has(edge.sourceId)) return [];
    const remoteDate = remoteDates.get(edge.targetId);
    if (!remoteDate) return [];
    let target = localDates.get(remoteDate.properties.value);
    if (!target) {
      target = remoteDate;
      localDates.set(remoteDate.properties.value, target);
      addedDates.set(target.id, target);
    }
    return [{ ...edge, targetId: target.id }];
  });
  return {
    ...next,
    nodes: [...next.nodes, ...addedDates.values(), ...events],
    relationships: [...next.relationships, ...eventEdges],
  };
}
