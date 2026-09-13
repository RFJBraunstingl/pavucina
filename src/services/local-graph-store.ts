import { createSeedGraph } from "../data/seed-graph.ts";
import { ensureRootNode, isGraph } from "./graph-service.ts";
import type { Graph } from "@/types/graph";

const STORAGE_KEY = "pavucina.graph.v1";
const INVALID_GRAPH_MESSAGE =
  "The saved browser graph is invalid or unsupported. Restore a compatible backup in Preferences.";

export function loadGuestGraph(today: string) {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return createSeedGraph(today);
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error(INVALID_GRAPH_MESSAGE);
  }
  if (!isGraph(parsed)) throw new Error(INVALID_GRAPH_MESSAGE);
  return ensureRootNode(parsed);
}

export function saveGuestGraph(graph: Graph) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
    return true;
  } catch {
    // Keep the in-memory app usable when browser storage is unavailable or full.
    return false;
  }
}
