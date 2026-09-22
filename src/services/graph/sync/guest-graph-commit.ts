import {
  browserDatabase,
  idbCompletion,
  idbRequest,
} from "../client/browser-database.ts";
import {
  applyGraphOperations,
  GraphConflictError,
} from "./graph-patch-service.ts";
import {
  changedGraphRecords,
  mergeRecords,
  recordKey,
  recordsGraph,
} from "./graph-record-service.ts";
import type {
  GraphPatch,
  GraphSnapshot,
} from "@/types/graph/graph-sync.ts";

export async function commitGuestPatches(
  patches: GraphPatch[],
): Promise<GraphSnapshot> {
  const database = await browserDatabase();
  const transaction = database.transaction(["records", "meta"], "readwrite");
  const completed = idbCompletion(transaction);
  const records = transaction.objectStore("records");
  const metadata = transaction.objectStore("meta");

  try {
    const saved = await idbRequest(metadata.get("guest"));
    const savedRows = await idbRequest(
      records.index("scope").getAll("guest"),
    );
    const previousRecords = savedRows.map((row) => row.record);
    let graph = recordsGraph(previousRecords);

    for (const patch of patches) {
      if (patch.baseRevision.generation !== saved.revision.generation) {
        throw new GraphConflictError([{
          id: "graph",
          field: "workspace replaced",
          mine: patch.operations,
        }]);
      }
      graph = applyGraphOperations(graph, patch.operations);
    }

    const changes = changedGraphRecords(previousRecords, graph);
    for (const record of changes) {
      const key = `guest:${recordKey(record)}`;
      if (record.deleted) records.delete(key);
      else records.put({ key, scope: "guest", record });
    }
    const revision = {
      generation: saved.revision.generation,
      sequence: saved.revision.sequence + (changes.length ? 1 : 0),
    };
    metadata.put({ revision, patches: [] }, "guest");
    await completed;
    return {
      revision,
      records: mergeRecords(previousRecords, changes),
    };
  } catch (error) {
    transaction.abort();
    await completed.catch(() => undefined);
    throw error;
  }
}
