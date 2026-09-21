import { browserDatabase, idbCompletion, idbRequest } from "../client/browser-database.ts";
import { applyGraphOperations, GraphConflictError } from "./graph-patch-service.ts";
import { changedGraphRecords, mergeRecords, recordKey, recordsGraph } from "./graph-record-service.ts";
import type { GraphPatch, GraphSnapshot } from "@/types/graph/graph-sync.ts";

export async function commitGuestPatches(patches: GraphPatch[]): Promise<GraphSnapshot> {
  const transaction = (await browserDatabase()).transaction(["records", "meta"], "readwrite");
  const completed = idbCompletion(transaction);
  const store = transaction.objectStore("records"), meta = transaction.objectStore("meta");
  try {
    const saved = await idbRequest(meta.get("guest"));
    const previous = (await idbRequest(store.index("scope").getAll("guest"))).map((row) => row.record);
    let graph = recordsGraph(previous);
    for (const patch of patches) {
      if (patch.baseRevision.generation !== saved.revision.generation) throw new GraphConflictError([{ id: "graph", field: "workspace replaced", mine: patch.operations }]);
      graph = applyGraphOperations(graph, patch.operations);
    }
    const changes = changedGraphRecords(previous, graph);
    for (const record of changes) {
      const key = `guest:${recordKey(record)}`;
      if (record.deleted) store.delete(key);
      else store.put({ key, scope: "guest", record });
    }
    const revision = { generation: saved.revision.generation, sequence: saved.revision.sequence + (changes.length ? 1 : 0) };
    meta.put({ revision, patches: [] }, "guest");
    await completed;
    return { revision, records: mergeRecords(previous, changes) };
  } catch (error) { transaction.abort(); await completed.catch(() => undefined); throw error; }
}
