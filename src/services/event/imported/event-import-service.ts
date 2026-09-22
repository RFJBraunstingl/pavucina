import { importedCalendarMetadata } from "./event-import-properties.ts";
import { removeImportedEvents } from "./event-removal-service.ts";
import { upsertImportedEvents } from "./event-upsert-service.ts";
import { isImportedEvent } from "@/utils/calendar/events/event.ts";
import type { ImportedEventNode } from "@/types/calendar/events/event.ts";
import type {
  CalendarSyncBatch,
  ExternalCalendarEvent,
} from "@/types/calendar/events/external-calendar.ts";
import type { Graph } from "@/types/graph/graph.ts";

function changedEvents(batch: CalendarSyncBatch) {
  return [...new Map(batch.changes.flatMap((change) =>
    change.action === "upsert"
      ? [[change.event.id, change.event] as const]
      : [])).values()];
}

function isEventFromCalendar(
  node: Graph["nodes"][number],
  batch: CalendarSyncBatch,
): node is ImportedEventNode {
  if (!isImportedEvent(node)) return false;
  const origin = node.properties.externalOrigin;
  return origin.connectionId === batch.connectionId &&
    origin.calendarId === batch.calendar.id;
}

function updateCalendarMetadata(graph: Graph, batch: CalendarSyncBatch) {
  return {
    ...graph,
    nodes: graph.nodes.map((node) =>
      isEventFromCalendar(node, batch)
        ? {
            ...node,
            properties: {
              ...node.properties,
              ...importedCalendarMetadata(batch),
            },
          }
        : node),
  };
}

function removeMissingEvents(
  graph: Graph,
  batch: CalendarSyncBatch,
  upserts: ExternalCalendarEvent[],
) {
  const retainedIds = new Set(upserts.map(({ id }) => id));
  const deletedIds = new Set(batch.changes.flatMap((change) =>
    change.action === "delete" ? [change.eventId] : []));
  return removeImportedEvents(graph, (node) =>
    isEventFromCalendar(node, batch) &&
    (deletedIds.has(node.properties.externalOrigin.eventId) ||
      (batch.authoritative &&
        !retainedIds.has(node.properties.externalOrigin.eventId))),
  );
}

export function reconcileCalendarBatch(
  graph: Graph,
  batch: CalendarSyncBatch,
  timeZone: string,
) {
  const upserts = changedEvents(batch);
  const metadataUpdated = updateCalendarMetadata(graph, batch);
  const retainedEvents = removeMissingEvents(metadataUpdated, batch, upserts);
  return upsertImportedEvents(retainedEvents, batch, upserts, timeZone);
}
