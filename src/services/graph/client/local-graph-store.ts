import { createSeedGraph } from "@/data/seed-graph.ts";
import { ensureRootNode, isGraph } from "../core/graph-service.ts";
import { changedGraphRecords, recordsGraph } from "../sync/records/graph-record-service.ts";
import { readBrowserGraph, writeBrowserGraph } from "./browser-database.ts";
import type { Graph } from "@/types/graph/graph.ts";

const STORAGE_KEY = "pavucina.graph.v1";

function invalidLegacyGraph(today: string) {
  return new Error(
    "The saved browser graph is invalid or unsupported. " +
    `Restore a compatible backup in Preferences. (${today})`,
  );
}

export function parseLegacyGraph(stored: string, today: string) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw invalidLegacyGraph(today);
  }
  if (!isGraph(parsed)) throw invalidLegacyGraph(today);
  return ensureRootNode(parsed);
}

export async function loadGuestGraph(today: string) {
  const saved = await readBrowserGraph("guest");
  if (saved) {
    const graph = recordsGraph(saved.snapshot.records);
    if (!isGraph(graph)) {
      throw new Error(
        "The saved browser graph is invalid. Restore a backup in Preferences.",
      );
    }
    return graph;
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  const graph = stored === null
    ? createSeedGraph(today)
    : parseLegacyGraph(stored, today);
  await saveGuestGraph(graph);
  return graph;
}

export async function saveGuestGraph(graph: Graph, replacement = false) {
  if (!isGraph(graph)) throw new Error("Invalid graph");
  const previous = await readBrowserGraph("guest");
  const records = changedGraphRecords([], graph);
  const revision = {
    generation: replacement
      ? crypto.randomUUID()
      : previous?.snapshot.revision.generation ?? crypto.randomUUID(),
    sequence: (previous?.snapshot.revision.sequence ?? 0) + 1,
  };
  await writeBrowserGraph("guest", { records, revision }, []);
  return true;
}
