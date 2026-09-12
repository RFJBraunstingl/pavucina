import { getTaskDate } from "./task-schedule-service.ts";
import { isInboxNodes } from "./inbox-validation-service.ts";
import { daysBetween, isIsoDate } from "../utils/date.ts";
import { isUuid } from "../utils/id.ts";
import { isTime } from "../utils/time.ts";
import { isMailTaskOrigin } from "../utils/mailbox.ts";
import type {
  DateNode,
  Graph,
  GraphNode,
  Relationship,
  RelationshipType,
  RootNode,
  TaskNode,
} from "@/types/graph";

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "child",
  "plannedStartDate",
  "plannedEndDate",
  "markedAsDone",
  "wasMarkedAsDone",
  "markedAsReopened",
];
const UNIQUE_DATE_RELATIONSHIPS: RelationshipType[] = [
  "plannedStartDate",
  "plannedEndDate",
  "markedAsDone",
];

export { isUuid } from "../utils/id.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function ensureRootNode(graph: Graph): Graph {
  const root = graph.nodes.find(
    (node): node is RootNode => node.type === "root",
  );
  const parentedTaskIds = new Set(
    graph.relationships
      .filter((relationship) => relationship.type === "child")
      .map((relationship) => relationship.targetId),
  );
  const topLevelTasks = graph.nodes.filter(
    (node): node is TaskNode =>
      node.type === "task" && !parentedTaskIds.has(node.id),
  );
  if (root && !topLevelTasks.length) return graph;

  const nextRoot =
    root ??
    ({
      id: crypto.randomUUID(),
      type: "root",
      properties: {},
    } satisfies RootNode);
  return {
    ...graph,
    nodes: root ? graph.nodes : [nextRoot, ...graph.nodes],
    relationships: [
      ...graph.relationships,
      ...topLevelTasks.map((task) => ({
        id: crypto.randomUUID(),
        type: "child" as const,
        sourceId: nextRoot.id,
        targetId: task.id,
      })),
    ],
  };
}

export function isGraph(value: unknown): value is Graph {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.relationships)
  ) {
    return false;
  }

  const nodes = new Map<string, GraphNode>();
  for (const rawNode of value.nodes) {
    if (
      !isRecord(rawNode) ||
      typeof rawNode.id !== "string" ||
      !isUuid(rawNode.id) ||
      nodes.has(rawNode.id)
    ) {
      return false;
    }
    if (!isRecord(rawNode.properties)) return false;
    const properties = rawNode.properties;
    const validDone =
      properties.done === undefined || typeof properties.done === "boolean";
    const validDescription =
      properties.description === undefined ||
      typeof properties.description === "string";
    const validMailOrigin =
      properties.mailOrigin === undefined ||
      isMailTaskOrigin(properties.mailOrigin);

    const validTimes = ["plannedStartTime", "plannedEndTime"].every((key) => {
      const time = properties[key];
      return time === undefined || (typeof time === "string" && isTime(time));
    });
    if (!validTimes) return false;

    if (
      rawNode.type === "task" &&
      typeof properties.name === "string" &&
      properties.name.trim() &&
      validDescription &&
      validMailOrigin &&
      validDone
    ) {
      nodes.set(rawNode.id, rawNode as TaskNode);
    } else if (
      rawNode.type === "date" &&
      typeof properties.value === "string" &&
      isIsoDate(properties.value)
    ) {
      nodes.set(rawNode.id, rawNode as DateNode);
    } else if (
      rawNode.type === "root" &&
      Object.keys(properties).length === 0
    ) {
      nodes.set(rawNode.id, rawNode as RootNode);
    } else {
      return false;
    }
  }

  if (!isInboxNodes(value.inboxNodes, new Set(nodes.keys()))) return false;

  if ([...nodes.values()].filter((node) => node.type === "root").length > 1) {
    return false;
  }

  const relationshipIds = new Set<string>();
  const parents = new Set<string>();
  const dateRelationships = new Set<string>();
  const children = new Map<string, string[]>();

  for (const rawRelationship of value.relationships) {
    if (
      !isRecord(rawRelationship) ||
      typeof rawRelationship.id !== "string" ||
      !isUuid(rawRelationship.id) ||
      relationshipIds.has(rawRelationship.id) ||
      typeof rawRelationship.sourceId !== "string" ||
      typeof rawRelationship.targetId !== "string" ||
      !RELATIONSHIP_TYPES.includes(rawRelationship.type as RelationshipType)
    ) {
      return false;
    }

    const relationship = rawRelationship as Relationship;
    const source = nodes.get(relationship.sourceId);
    const target = nodes.get(relationship.targetId);
    if (!source || !target) return false;

    if (relationship.type === "child") {
      if (
        (source.type !== "task" && source.type !== "root") ||
        target.type !== "task" ||
        parents.has(target.id)
      ) {
        return false;
      }
      parents.add(target.id);
      children.set(source.id, [...(children.get(source.id) ?? []), target.id]);
    } else {
      if (
        source.type !== "task" ||
        target.type !== "date"
      ) {
        return false;
      }
      if (UNIQUE_DATE_RELATIONSHIPS.includes(relationship.type)) {
        const key = `${source.id}:${relationship.type}`;
        if (dateRelationships.has(key)) return false;
        dateRelationships.add(key);
      }
    }

    relationshipIds.add(relationship.id);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const child of children.get(id) ?? []) if (!visit(child)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  for (const node of nodes.values()) {
    if (node.type === "task" && !visit(node.id)) return false;
  }

  const graph = value as Graph;
  for (const node of nodes.values()) {
    if (node.type !== "task") continue;
    const start = getTaskDate(graph, node.id, "plannedStartDate");
    const end = getTaskDate(graph, node.id, "plannedEndDate");
    if (start && end && daysBetween(start, end) < 0) return false;
  }
  return true;
}
