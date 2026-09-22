import { isIsoDate } from "@/utils/shared/temporal/date.ts";
import { isUuid } from "@/utils/shared/id.ts";
import { isTime } from "@/utils/shared/temporal/time.ts";
import { isMailTaskOrigin } from "@/utils/mailbox.ts";
import {
  calendarEventOriginKey,
  isEventProperties,
} from "@/utils/calendar/events/event.ts";
import type { EventNode } from "@/types/calendar/events/event";
import type {
  DateNode,
  GraphNode,
  RootNode,
  TaskNode,
} from "@/types/graph/graph";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isTaskNode(
  node: Record<string, unknown>,
  properties: Record<string, unknown>,
) {
  const descriptionValid =
    properties.description === undefined ||
    typeof properties.description === "string";
  const mailOriginValid =
    properties.mailOrigin === undefined ||
    isMailTaskOrigin(properties.mailOrigin);
  return node.type === "task" &&
    typeof properties.name === "string" &&
    Boolean(properties.name.trim()) &&
    descriptionValid &&
    mailOriginValid &&
    !("done" in properties);
}

export function validateGraphNodes(rawNodes: unknown[]) {
  const nodes = new Map<string, GraphNode>();
  const eventOrigins = new Set<string>();
  for (const rawNode of rawNodes) {
    if (
      !isRecord(rawNode) ||
      typeof rawNode.id !== "string" ||
      !isUuid(rawNode.id) ||
      nodes.has(rawNode.id) ||
      !isRecord(rawNode.properties)
    ) {
      return null;
    }
    const properties = rawNode.properties;
    const timesValid = ["plannedStartTime", "plannedEndTime"].every((key) => {
      const time = properties[key];
      return time === undefined || (typeof time === "string" && isTime(time));
    });
    if (!timesValid) return null;
    if (isTaskNode(rawNode, properties)) {
      nodes.set(rawNode.id, rawNode as TaskNode);
    } else if (rawNode.type === "event" && isEventProperties(properties)) {
      const event = rawNode as EventNode;
      if (event.properties.externalOrigin) {
        const key = calendarEventOriginKey(event.properties.externalOrigin);
        if (eventOrigins.has(key)) return null;
        eventOrigins.add(key);
      }
      nodes.set(rawNode.id, event);
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
      return null;
    }
  }
  return nodes;
}
