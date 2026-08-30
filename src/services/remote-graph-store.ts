import { isGraph } from "./graph-service";
import type { Graph } from "@/types/graph";

export async function loadRemoteGraph(): Promise<Graph | null> {
  const response = await fetch("/api/graph", { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Could not load your saved graph");

  const value: unknown = await response.json();
  if (!isGraph(value)) throw new Error("The saved graph is invalid");
  return value;
}

export async function saveRemoteGraph(graph: Graph) {
  const response = await fetch("/api/graph", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(graph),
  });
  if (!response.ok) throw new Error("Could not save your graph");
}
