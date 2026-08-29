import { getTaskDate } from "./task-schedule-service.ts";
import { daysBetween, isIsoDate } from "../utils/date.ts";
import { isTime } from "../utils/time.ts";
import type {
  DateNode,
  Graph,
  GraphNode,
  Relationship,
  RelationshipType,
  TaskNode,
} from "@/types/graph";

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "child",
  "plannedStartDate",
  "plannedEndDate",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
    if (!isRecord(rawNode) || typeof rawNode.id !== "string" || nodes.has(rawNode.id)) {
      return false;
    }
    if (!isRecord(rawNode.properties)) return false;
    const properties = rawNode.properties;

    const validTimes = ["plannedStartTime", "plannedEndTime"].every((key) => {
      const time = properties[key];
      return time === undefined || (typeof time === "string" && isTime(time));
    });
    if (!validTimes) return false;

    if (
      rawNode.type === "task" &&
      typeof properties.name === "string" &&
      properties.name.trim()
    ) {
      nodes.set(rawNode.id, rawNode as TaskNode);
    } else if (
      rawNode.type === "date" &&
      typeof properties.value === "string" &&
      isIsoDate(properties.value) &&
      rawNode.id === `date:${properties.value}`
    ) {
      nodes.set(rawNode.id, rawNode as DateNode);
    } else {
      return false;
    }
  }

  const relationshipIds = new Set<string>();
  const parents = new Set<string>();
  const dateRelationships = new Set<string>();
  const children = new Map<string, string[]>();

  for (const rawRelationship of value.relationships) {
    if (
      !isRecord(rawRelationship) ||
      typeof rawRelationship.id !== "string" ||
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
    if (!source || source.type !== "task" || !target) return false;

    if (relationship.type === "child") {
      if (target.type !== "task" || parents.has(target.id)) return false;
      parents.add(target.id);
      children.set(source.id, [...(children.get(source.id) ?? []), target.id]);
    } else {
      const key = `${source.id}:${relationship.type}`;
      if (target.type !== "date" || dateRelationships.has(key)) return false;
      dateRelationships.add(key);
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
