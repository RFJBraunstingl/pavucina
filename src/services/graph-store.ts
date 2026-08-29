import { createSeedGraph } from "../data/seed-graph.ts";
import { isGraph } from "./graph-service.ts";
import type { Graph } from "@/types/graph";

const STORAGE_KEY = "pavucina.graph.v1";

export function loadGraph(today: string) {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (isGraph(parsed)) return parsed;
    }
  } catch {
    // A bad browser value should not prevent the application from opening.
  }
  return createSeedGraph(today);
}

export function saveGraph(graph: Graph) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(graph));
}
