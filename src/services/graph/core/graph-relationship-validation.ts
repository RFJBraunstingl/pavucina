import { isCompletionRelationship } from "@/services/event/completion-service.ts";
import { isUuid } from "@/utils/shared/id.ts";
import { isRecord } from "./graph-node-validation";
import type {
  GraphNode,
  Relationship,
  RelationshipType,
} from "@/types/graph/graph";

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "child",
  "plannedStartDate",
  "plannedEndDate",
  "markedAsDone",
  "wasMarkedAsDone",
  "markedAsReopened",
  "eventStartDate",
  "eventEndDate",
];
const UNIQUE_DATE_RELATIONSHIPS: RelationshipType[] = [
  "plannedStartDate",
  "plannedEndDate",
  "markedAsDone",
];

function validRelationshipShape(
  value: unknown,
  relationshipIds: Set<string>,
) {
  return isRecord(value) &&
    typeof value.id === "string" &&
    isUuid(value.id) &&
    !relationshipIds.has(value.id) &&
    typeof value.sourceId === "string" &&
    typeof value.targetId === "string" &&
    RELATIONSHIP_TYPES.includes(value.type as RelationshipType);
}

export function validateGraphRelationships(
  rawRelationships: unknown[],
  nodes: Map<string, GraphNode>,
) {
  const relationshipIds = new Set<string>();
  const parents = new Set<string>();
  const dateRelationships = new Set<string>();
  const children = new Map<string, string[]>();

  for (const rawRelationship of rawRelationships) {
    if (!validRelationshipShape(rawRelationship, relationshipIds)) return null;
    const relationship = rawRelationship as Relationship;
    const source = nodes.get(relationship.sourceId);
    const target = nodes.get(relationship.targetId);
    if (!source || !target) return null;

    if (relationship.type === "child") {
      if (
        (source.type !== "task" && source.type !== "root") ||
        target.type !== "task" ||
        parents.has(target.id)
      ) {
        return null;
      }
      parents.add(target.id);
      const childIds = children.get(source.id) ?? [];
      childIds.push(target.id);
      children.set(source.id, childIds);
    } else if (
      relationship.type === "eventStartDate" ||
      relationship.type === "eventEndDate"
    ) {
      if (source.type !== "event" || target.type !== "date") return null;
      const key = `${source.id}:${relationship.type}`;
      if (dateRelationships.has(key)) return null;
      dateRelationships.add(key);
    } else {
      const validSource = source.type === "task" ||
        (source.type === "event" && isCompletionRelationship(relationship.type));
      if (!validSource || target.type !== "date") return null;
      if (UNIQUE_DATE_RELATIONSHIPS.includes(relationship.type)) {
        const key = `${source.id}:${relationship.type}`;
        if (dateRelationships.has(key)) return null;
        dateRelationships.add(key);
      }
    }
    relationshipIds.add(relationship.id);
  }
  return children;
}
