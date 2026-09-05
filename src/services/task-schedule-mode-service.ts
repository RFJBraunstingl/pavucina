import {
  getTaskDate,
  removeUnusedDates,
} from "./task-schedule-service.ts";
import type {
  DateRelationshipType,
  Graph,
} from "@/types/graph";
import type { ScheduleMode } from "@/types/preferences";

const DATE_RELATIONSHIPS: DateRelationshipType[] = [
  "plannedStartDate",
  "plannedEndDate",
];

export function isTaskSchedulable(
  graph: Graph,
  taskId: string,
  scheduleMode: ScheduleMode,
) {
  return (
    scheduleMode === "all" ||
    !graph.relationships.some(
      ({ type, sourceId }) => type === "child" && sourceId === taskId,
    )
  );
}

export function getEffectiveTaskDate(
  graph: Graph,
  taskId: string,
  type: DateRelationshipType,
  scheduleMode: ScheduleMode,
): string | undefined {
  if (isTaskSchedulable(graph, taskId, scheduleMode)) {
    return getTaskDate(graph, taskId, type);
  }
  const dates = graph.relationships
    .filter(
      (relationship) =>
        relationship.type === "child" && relationship.sourceId === taskId,
    )
    .flatMap((relationship) => {
      const date = getEffectiveTaskDate(
        graph,
        relationship.targetId,
        type,
        scheduleMode,
      );
      return date ? [date] : [];
    });
  return type === "plannedStartDate"
    ? dates.reduce<string | undefined>(
        (earliest, date) => (!earliest || date < earliest ? date : earliest),
        undefined,
      )
    : dates.reduce<string | undefined>(
        (latest, date) => (!latest || date > latest ? date : latest),
        undefined,
      );
}

export function clearTaskSchedule(graph: Graph, taskId: string) {
  return removeUnusedDates({
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.id !== taskId || node.type !== "task") return node;
      const properties = { ...node.properties };
      delete properties.plannedStartTime;
      delete properties.plannedEndTime;
      return { ...node, properties };
    }),
    relationships: graph.relationships.filter(
      (relationship) =>
        relationship.sourceId !== taskId ||
        !DATE_RELATIONSHIPS.includes(
          relationship.type as DateRelationshipType,
        ),
    ),
  });
}

export function clearParentTaskSchedules(graph: Graph) {
  const taskIds = new Set(
    graph.nodes.flatMap((node) => node.type === "task" ? [node.id] : []),
  );
  const parentIds = new Set(
    graph.relationships.flatMap((relationship) =>
      relationship.type === "child" && taskIds.has(relationship.sourceId)
        ? [relationship.sourceId]
        : [],
    ),
  );
  return [...parentIds].reduce(clearTaskSchedule, graph);
}
