import "server-only";

import { isGraph } from "../core/graph-service";
import {
  graphRevision,
  isDuplicateKeyError,
  MAX_GRAPH_WRITE_ATTEMPTS,
  writeGraphCommit,
} from "./graph-write-service";
import { latestCommit } from "./stores/graph-commit-store";
import { currentGraphRecords } from "./stores/graph-current-store";
import { loadLegacyGraph } from "./stores/legacy-graph-repository";
import type { Graph } from "@/types/graph/graph";
import type { GraphSnapshot } from "@/types/graph/graph-sync";

export async function loadGraphSnapshot(
  userId: string,
): Promise<GraphSnapshot | null> {
  for (let attempt = 0; attempt < MAX_GRAPH_WRITE_ATTEMPTS; attempt++) {
    const head = await latestCommit(userId);
    if (!head) {
      const legacyGraph = await loadLegacyGraph(userId);
      if (!legacyGraph) return null;
      if (!isGraph(legacyGraph)) {
        throw new Error(
          "The saved graph is invalid. Restore a backup in Preferences.",
        );
      }
      await replaceGraph(userId, legacyGraph, true);
      continue;
    }

    const records = await currentGraphRecords(userId, head);
    if ((await latestCommit(userId))?._id === head._id) {
      return {
        revision: graphRevision(head.generation, head.sequence),
        records,
      };
    }
  }
  throw new Error("The workspace is changing. Please retry loading it.");
}

export async function replaceGraph(
  userId: string,
  graph: Graph,
  onlyIfMissing = false,
) {
  const head = await latestCommit(userId);
  if (onlyIfMissing && head) return null;
  const base = head
    ? {
        revision: graphRevision(head.generation, head.sequence),
        records: [],
      }
    : null;
  try {
    return await writeGraphCommit(
      userId,
      graph,
      base,
      crypto.randomUUID(),
      "snapshot",
      true,
    );
  } catch (error) {
    if (isDuplicateKeyError(error) && onlyIfMissing) return null;
    throw error;
  }
}
