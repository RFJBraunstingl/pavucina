import { ensureRootNode, isGraph } from "./graph-service.ts";
import type { Graph } from "@/types/graph";

export async function loadRemoteGraph(): Promise<Graph | null> {
  const response = await fetch("/api/graph", { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load your saved graph");

  const value: unknown = await response.json();
  if (!isGraph(value)) throw new Error("The saved graph is invalid");
  return ensureRootNode(value);
}

export async function saveRemoteGraph(graph: Graph, onlyIfMissing = false) {
  const response = await fetch("/api/graph", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...(onlyIfMissing && { "if-none-match": "*" }),
    },
    body: JSON.stringify(graph),
  });
  if (response.status === 412) return false;
  if (!response.ok) throw new Error("Could not save your graph");
  return true;
}
