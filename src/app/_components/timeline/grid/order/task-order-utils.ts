import type { PointerEvent } from "react";

import type {
  FlatTask,
  Graph,
  TaskNode,
  TaskPlacement,
} from "@/types/graph/graph";
import type { TaskDropTarget } from "@/types/timeline/timeline-interaction";

const SCROLL_EDGE = 32;
const SCROLL_STEP = 20;
const TASK_ORDER_KEYS = [
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
] as const;
type TaskOrderKey = (typeof TASK_ORDER_KEYS)[number];

export function isTaskOrderKey(key: string): key is TaskOrderKey {
  return TASK_ORDER_KEYS.includes(key as TaskOrderKey);
}

function lastVisibleDescendant(tasks: FlatTask[], taskId: string) {
  const index = tasks.findIndex(({ task }) => task.id === taskId);
  if (index < 0) return taskId;
  let lastId = taskId;
  for (let next = index + 1; next < tasks.length; next += 1) {
    if (tasks[next].depth <= tasks[index].depth) break;
    lastId = tasks[next].task.id;
  }
  return lastId;
}

export function dropTargetAt(
  event: PointerEvent<HTMLButtonElement>,
  tasks: FlatTask[],
): TaskDropTarget | null {
  const row = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest<HTMLElement>("[data-task-id]");
  const targetId = row?.dataset.taskId;
  if (!row || !targetId) return null;
  const bounds = row.getBoundingClientRect();
  const position = (event.clientY - bounds.top) / bounds.height;
  const placement: TaskPlacement =
    position < 1 / 3 ? "before" : position > 2 / 3 ? "after" : "inside";
  return {
    targetId,
    placement,
    indicatorId:
      placement === "after" ? lastVisibleDescendant(tasks, targetId) : targetId,
  };
}

export function visibleSibling(
  tasks: FlatTask[],
  parents: ReadonlyMap<string, string>,
  taskId: string,
  direction: -1 | 1,
) {
  const index = tasks.findIndex(({ task }) => task.id === taskId);
  const parentId = parents.get(taskId);
  for (let next = index + direction; next >= 0 && next < tasks.length; next += direction) {
    if (parents.get(tasks[next].task.id) === parentId) return tasks[next].task.id;
  }
}

export function scrollTaskListNearEdge(
  scroll: HTMLDivElement | null,
  pointerY: number,
) {
  if (!scroll) return;
  const bounds = scroll.getBoundingClientRect();
  if (pointerY < bounds.top + SCROLL_EDGE) {
    scroll.scrollBy(0, -SCROLL_STEP);
  } else if (pointerY > bounds.bottom - SCROLL_EDGE) {
    scroll.scrollBy(0, SCROLL_STEP);
  }
}

export function keyboardOrderTarget(
  graph: Graph,
  tasks: FlatTask[],
  taskId: string,
  key: TaskOrderKey,
) {
  const parents = new Map(
    graph.relationships
      .filter((relationship) => relationship.type === "child")
      .map((relationship) => [relationship.targetId, relationship.sourceId]),
  );
  if (key === "ArrowLeft") {
    const parentId = parents.get(taskId);
    const parentIsTask = graph.nodes.some(
      (node) => node.id === parentId && node.type === "task",
    );
    return parentId && parentIsTask
      ? { targetId: parentId, placement: "after" as const }
      : null;
  }

  const direction = key === "ArrowDown" ? 1 : -1;
  const targetId = visibleSibling(tasks, parents, taskId, direction);
  if (!targetId) return null;
  const placement: TaskPlacement = key === "ArrowRight"
    ? "inside"
    : direction < 0
      ? "before"
      : "after";
  return { targetId, placement };
}

export function taskName(graph: Graph, taskId: string) {
  return graph.nodes.find(
    (node): node is TaskNode => node.id === taskId && node.type === "task",
  )?.properties.name;
}
