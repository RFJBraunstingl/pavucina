import { isInboxNodes } from "@/services/inbox/inbox-validation-service.ts";
import { isRecord, validateGraphNodes } from "./graph-node-validation";
import { validateGraphRelationships } from "./graph-relationship-validation";
import {
  hasAcyclicTaskHierarchy,
  hasValidGraphDateRanges,
} from "./graph-validation.ts";
import type { Graph } from "@/types/graph/graph";

export { isUuid } from "@/utils/shared/id.ts";
export { ensureRootNode } from "@/services/task/core/task-tree-service.ts";

export function isGraph(value: unknown): value is Graph {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.relationships)
  ) {
    return false;
  }
  const nodes = validateGraphNodes(value.nodes);
  if (!nodes || !isInboxNodes(value.inboxNodes, new Set(nodes.keys()))) {
    return false;
  }
  if ([...nodes.values()].filter((node) => node.type === "root").length > 1) {
    return false;
  }
  const children = validateGraphRelationships(value.relationships, nodes);
  if (!children) return false;

  const graph = value as Graph;
  return hasAcyclicTaskHierarchy(nodes.values(), children) &&
    hasValidGraphDateRanges(graph, nodes.values());
}
