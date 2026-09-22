import { isGraph } from "../core/graph-service.ts";
import { GraphConflictError } from "../sync/graph-conflict-error.ts";
import { mergeRecords, recordsGraph } from "../sync/records/graph-record-service.ts";
import { isGraphRevision } from "../sync/graph-sync-validation.ts";
import type { Graph } from "@/types/graph/graph.ts";
import type {
  GraphChanges,
  GraphPatch,
  GraphSnapshot,
} from "@/types/graph/graph-sync.ts";

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (response.status === 409 && body.conflicts) {
    throw new GraphConflictError(body.conflicts);
  }
  if (!response.ok) {
    throw new Error(body.error ?? "Could not synchronize your graph");
  }
  return body;
}

function validSnapshot(value: unknown): value is GraphSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as GraphSnapshot;
  return isGraphRevision(snapshot.revision) &&
    Array.isArray(snapshot.records) &&
    isGraph(recordsGraph(snapshot.records));
}

export async function loadRemoteGraph(): Promise<GraphSnapshot | null> {
  const response = await fetch("/api/graph", { cache: "no-store" });
  if (response.status === 404) return null;
  const snapshot: unknown = await responseJson(response);
  if (!validSnapshot(snapshot)) throw new Error("The saved graph is invalid");
  return snapshot;
}

function changesQuery(
  snapshot: GraphSnapshot,
  offset: number,
  until?: number,
) {
  return new URLSearchParams({
    generation: snapshot.revision.generation,
    after: String(snapshot.revision.sequence),
    offset: String(offset),
    ...(until !== undefined && { until: String(until) }),
  });
}

export async function pullGraphChanges(
  snapshot: GraphSnapshot,
): Promise<GraphSnapshot> {
  let offset: number | null = 0;
  let until: number | undefined;
  let retryCount = 0;
  let records = snapshot.records;
  let revision = snapshot.revision;

  while (offset !== null) {
    const response = await fetch(
      `/api/graph/changes?${changesQuery(snapshot, offset, until)}`,
      { cache: "no-store" },
    );
    if (response.status === 409) {
      const reason = await response.json();
      if (reason.retry && retryCount++ < 5) {
        offset = 0;
        until = undefined;
        records = snapshot.records;
        revision = snapshot.revision;
        continue;
      }
      if (reason.retry) {
        throw new Error(
          "The workspace is changing. Please retry synchronization.",
        );
      }
      const replacement = await loadRemoteGraph();
      if (!replacement) throw new Error("Workspace no longer exists");
      return replacement;
    }

    const page: GraphChanges = await responseJson(response);
    if (!isGraphRevision(page.revision) || !Array.isArray(page.records)) {
      throw new Error("Invalid graph changes");
    }
    records = mergeRecords(records, page.records);
    revision = page.revision;
    until = revision.sequence;
    offset = page.nextOffset;
  }

  if (!isGraph(recordsGraph(records))) {
    throw new Error("The synchronized graph is invalid");
  }
  return { revision, records };
}

export async function sendGraphPatch(patch: GraphPatch) {
  const response = await fetch("/api/graph", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  return responseJson(response);
}

export async function saveRemoteGraph(graph: Graph, onlyIfMissing = false) {
  if (!onlyIfMissing) {
    throw new Error("Use incremental graph patches for ordinary saves");
  }
  const response = await fetch("/api/graph", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "if-none-match": "*",
    },
    body: JSON.stringify(graph),
  });
  if (response.status === 412) return false;
  await responseJson(response);
  return true;
}

export async function restoreRemoteGraph(graph: Graph) {
  const response = await fetch("/api/graph", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(graph),
  });
  return responseJson(response);
}
