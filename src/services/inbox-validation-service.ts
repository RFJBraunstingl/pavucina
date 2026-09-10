import { isUuid } from "../utils/id.ts";
import { isTime } from "../utils/time.ts";
import type { TaskNode } from "@/types/graph";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isInboxNodes(
  value: unknown,
  graphNodeIds: ReadonlySet<string>,
): value is TaskNode[] | undefined {
  if (value === undefined) return true;
  if (!Array.isArray(value)) return false;
  const ids = new Set<string>();
  return value.every((node) => {
    if (
      !isRecord(node) ||
      node.type !== "task" ||
      typeof node.id !== "string" ||
      !isUuid(node.id) ||
      graphNodeIds.has(node.id) ||
      ids.has(node.id) ||
      !isRecord(node.properties)
    ) {
      return false;
    }
    const properties = node.properties;
    if (
      typeof properties.name !== "string" ||
      !properties.name.trim() ||
      (properties.description !== undefined &&
        typeof properties.description !== "string") ||
      (properties.done !== undefined &&
        typeof properties.done !== "boolean") ||
      !["plannedStartTime", "plannedEndTime"].every((key) => {
        const time = properties[key];
        return time === undefined || (typeof time === "string" && isTime(time));
      })
    ) {
      return false;
    }
    ids.add(node.id);
    return true;
  });
}
