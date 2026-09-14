import { isGraph } from "./graph-service.ts";
import { recordsGraph, mergeRecords } from "./graph-record-service.ts";
import { isGraphRevision } from "./graph-sync-validation.ts";
import { GraphConflictError } from "./graph-patch-service.ts";
import type { Graph } from "../types/graph.ts";
import type { GraphChanges, GraphPatch, GraphSnapshot } from "../types/graph-sync.ts";

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (response.status === 409 && body.conflicts) throw new GraphConflictError(body.conflicts);
  if (!response.ok) throw new Error(body.error ?? "Could not synchronize your graph");
  return body;
}
export async function loadRemoteGraph(): Promise<GraphSnapshot | null> {
  const response = await fetch("/api/graph", { cache: "no-store" });
  if (response.status === 404) return null;
  const snapshot = await responseJson(response);
  if (!isGraphRevision(snapshot.revision) || !Array.isArray(snapshot.records) || !isGraph(recordsGraph(snapshot.records))) throw new Error("The saved graph is invalid");
  return snapshot;
}
export async function pullGraphChanges(snapshot: GraphSnapshot): Promise<GraphSnapshot> {
  let offset: number | null = 0;
  let until: number | undefined;
  let retries = 0;
  let records = snapshot.records;
  let revision = snapshot.revision;
  while (offset !== null) {
    const query = new URLSearchParams({ generation: snapshot.revision.generation,
      after: String(snapshot.revision.sequence), offset: String(offset), ...(until !== undefined && { until: String(until) }) });
    const response = await fetch(`/api/graph/changes?${query}`, { cache: "no-store" });
    if (response.status === 409) {
      const reason = await response.json();
      if (reason.retry && retries++ < 5) { offset = 0; until = undefined; records = snapshot.records; continue; }
      if (reason.retry) throw new Error("The workspace is changing. Please retry synchronization.");
      const replacement = await loadRemoteGraph();
      if (!replacement) throw new Error("Workspace no longer exists");
      return replacement;
    }
    const page: GraphChanges = await responseJson(response);
    if (!isGraphRevision(page.revision) || !Array.isArray(page.records)) throw new Error("Invalid graph changes");
    records = mergeRecords(records, page.records);
    revision = page.revision; until = revision.sequence; offset = page.nextOffset;
  }
  if (!isGraph(recordsGraph(records))) throw new Error("The synchronized graph is invalid");
  return { revision, records };
}
export async function sendGraphPatch(patch: GraphPatch) {
  return responseJson(await fetch("/api/graph", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) }));
}
export async function saveRemoteGraph(graph: Graph, onlyIfMissing = false) {
  if (!onlyIfMissing) throw new Error("Use incremental graph patches for ordinary saves");
  const response = await fetch("/api/graph", { method: "PUT", headers: { "content-type": "application/json", "if-none-match": "*" }, body: JSON.stringify(graph) });
  if (response.status === 412) return false;
  await responseJson(response); return true;
}
export async function restoreRemoteGraph(graph: Graph) {
  return responseJson(await fetch("/api/graph", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(graph) }));
}
