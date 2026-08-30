import { createSeedGraph } from "@/data/seed-graph";
import { ensureRootNode, isGraph } from "./graph-service.ts";
import type { Graph } from "@/types/graph";

const STORAGE_KEY = "pavucina.graph.v1";

export function loadGuestGraph(today: string) {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isGraph(parsed)) return ensureRootNode(parsed);
    }
  } catch {
    // A bad browser value should not prevent the application from opening.
  }
  return createSeedGraph(today);
}

export function saveGuestGraph(graph: Graph) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
  } catch {
    // Keep the in-memory app usable when browser storage is unavailable or full.
  }
}
