import "server-only";


import {
  syncCalendarConnection,
  type ConnectionSync,
} from "../providers/calendar-connection-sync.ts";
import {
  listCalendarConnections,
  updateCalendarEventSyncStates,
} from "../providers/calendar-repository.ts";
import {
  reconcileCalendarBatch,
  removeImportedEvents,
} from "@/services/event/event-service.ts";
import { updateGraphVersion } from "@/services/graph/persistence/graph-repository.ts";
import { loadPreferences } from "@/services/preferences/storage/preferences-repository.ts";
import type {
  CalendarConnectionDocument,
} from "@/types/calendar/external-calendar.ts";
import type { Graph } from "@/types/graph/graph.ts";

function removeUnavailableEvents(
  graph: Graph,
  connections: CalendarConnectionDocument[],
  results: ConnectionSync[],
) {
  const calendarsByConnection = new Map(connections.map((connection, index) => {
    const calendars = results[index]?.calendars;
    return [
      connection._id,
      calendars ? new Set(calendars.map(({ id }) => id)) : undefined,
    ] as const;
  }));
  return removeImportedEvents(graph, ({ properties }) => {
    const { connectionId, calendarId } = properties.externalOrigin;
    if (!calendarsByConnection.has(connectionId)) return true;
    const calendars = calendarsByConnection.get(connectionId);
    return Boolean(calendars && !calendars.has(calendarId));
  });
}

export async function syncCalendarEvents(userId: string, timeZone: string) {
  const preferences = await loadPreferences(userId);
  if (!preferences.calendarEventImportEnabled) {
    throw new Error("Calendar event import is not enabled");
  }
  const connections = await listCalendarConnections(userId);
  const results = await Promise.all(
    connections.map((connection) => syncCalendarConnection(connection, timeZone)),
  );
  const revision = await updateGraphVersion(userId, (graph) => {
    let next = removeUnavailableEvents(graph, connections, results);
    for (const { batches } of results) {
      for (const batch of batches) next = reconcileCalendarBatch(next, batch, timeZone);
    }
    return next;
  });
  await Promise.all(connections.map((connection, index) =>
    updateCalendarEventSyncStates(userId, connection._id, connection.eventSyncStates ?? [], results[index].states)));
  return {
    revision,
    errors: results.flatMap(({ errors }) => errors),
    syncedAt: new Date().toISOString(),
  };
}

export async function removeAllCalendarEvents(userId: string) {
  const revision = await updateGraphVersion(userId, (graph) => removeImportedEvents(graph));
  const connections = await listCalendarConnections(userId);
  await Promise.all(connections.map(({ _id, eventSyncStates }) =>
    updateCalendarEventSyncStates(userId, _id, eventSyncStates ?? [], [])));
  return { revision, errors: [], syncedAt: new Date().toISOString() };
}

export async function removeCalendarConnectionEvents(
  userId: string,
  connectionId: string,
) {
  const revision = await updateGraphVersion(userId, (graph) => removeImportedEvents(
    graph,
    (event) => event.properties.externalOrigin.connectionId === connectionId,
  ));
  return { revision, errors: [], syncedAt: new Date().toISOString() };
}
