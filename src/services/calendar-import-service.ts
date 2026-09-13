import "server-only";

import { isDeepStrictEqual } from "node:util";

import {
  syncCalendarConnection,
  type ConnectionSync,
} from "./calendar-connection-sync.ts";
import {
  listCalendarConnections,
  updateCalendarEventSyncStates,
} from "./calendar-repository.ts";
import {
  reconcileCalendarBatch,
  removeImportedEvents,
} from "./event-service.ts";
import { loadLatestGraph, saveGraphVersion } from "./graph-repository.ts";
import { graphByteLength, MAX_GRAPH_BYTES } from "./graph-size.ts";
import { loadPreferences } from "./preferences-repository.ts";
import type {
  CalendarConnectionDocument,
} from "../types/external-calendar.ts";
import type { Graph } from "../types/graph.ts";

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
  const graph = await loadLatestGraph(userId);
  if (!graph) throw new Error("Create a workspace before importing events");
  const connections = await listCalendarConnections(userId);
  const results = await Promise.all(
    connections.map((connection) => syncCalendarConnection(connection, timeZone)),
  );
  let next = removeUnavailableEvents(graph, connections, results);
  for (const { batches } of results) {
    for (const batch of batches) next = reconcileCalendarBatch(next, batch, timeZone);
  }
  if (graphByteLength(next) > MAX_GRAPH_BYTES) {
    throw new Error("Imported calendar data makes the graph too large");
  }
  if (!isDeepStrictEqual(graph, next)) await saveGraphVersion(userId, next);
  await Promise.all(connections.map((connection, index) =>
    updateCalendarEventSyncStates(userId, connection._id, results[index].states)));
  return {
    graph: next,
    errors: results.flatMap(({ errors }) => errors),
    syncedAt: new Date().toISOString(),
  };
}

export async function removeAllCalendarEvents(userId: string) {
  const graph = await loadLatestGraph(userId);
  if (!graph) throw new Error("Workspace not found");
  const next = removeImportedEvents(graph);
  if (!isDeepStrictEqual(graph, next)) await saveGraphVersion(userId, next);
  const connections = await listCalendarConnections(userId);
  await Promise.all(connections.map(({ _id }) =>
    updateCalendarEventSyncStates(userId, _id, [])));
  return { graph: next, errors: [], syncedAt: new Date().toISOString() };
}

export async function removeCalendarConnectionEvents(
  userId: string,
  connectionId: string,
) {
  const graph = await loadLatestGraph(userId);
  if (!graph) throw new Error("Workspace not found");
  const next = removeImportedEvents(
    graph,
    (event) => event.properties.externalOrigin.connectionId === connectionId,
  );
  if (!isDeepStrictEqual(graph, next)) await saveGraphVersion(userId, next);
  return { graph: next, errors: [], syncedAt: new Date().toISOString() };
}
