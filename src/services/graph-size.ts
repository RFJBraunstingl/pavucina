import type { Graph } from "../types/graph.ts";

export const MAX_GRAPH_BYTES = 25 * 1024 * 1024;

export function graphByteLength(graph: Graph) {
  return new TextEncoder().encode(JSON.stringify(graph)).byteLength;
}
