import {
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";

import { placeTask } from "@/services/task-order-service";
import type { FlatTask, Graph, TaskNode, TaskPlacement } from "@/types/graph";
import type {
  TaskDropPreview,
  TaskDropTarget,
  TaskOrderDragState,
  TaskOrderOptions,
} from "@/types/timeline";

const DRAG_THRESHOLD = 4;
const SCROLL_EDGE = 32;
const SCROLL_STEP = 20;

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

function dropTargetAt(
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

function visibleSibling(
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

function taskName(graph: Graph, taskId: string) {
  return graph.nodes.find(
    (node): node is TaskNode => node.id === taskId && node.type === "task",
  )?.properties.name;
}

export function useTaskOrder({
  graph,
  scheduleMode,
  tasks,
  scrollRef,
  onGraphChange,
  onSelect,
  onExpand,
}: TaskOrderOptions) {
  const drag = useRef<TaskOrderDragState | null>(null);
  const previewRef = useRef<TaskDropPreview | null>(null);
  const [preview, setPreviewState] = useState<TaskDropPreview | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  function setPreview(value: TaskDropPreview | null) {
    previewRef.current = value;
    setPreviewState(value);
  }

  function clearOrder() {
    drag.current = null;
    setPreview(null);
    setDraggedId(null);
  }

  function announce(taskId: string, targetId: string, placement: TaskPlacement) {
    const relation = placement === "inside" ? "under" : placement;
    setAnnouncement(
      `Moved ${taskName(graph, taskId)} ${relation} ${taskName(graph, targetId)}.`,
    );
  }

  function applyOrder(taskId: string, targetId: string, placement: TaskPlacement) {
    const next = placeTask(graph, taskId, targetId, placement, scheduleMode);
    if (next === graph) return;
    onGraphChange(next);
    onSelect(taskId);
    if (placement === "inside") onExpand(targetId);
    announce(taskId, targetId, placement);
  }

  function beginOrder(event: PointerEvent<HTMLButtonElement>, taskId: string) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, taskId, originY: event.clientY };
    setDraggedId(taskId);
    onSelect(taskId);
  }

  function continueOrder(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientY - active.originY) < DRAG_THRESHOLD) return;
    event.preventDefault();

    const scroll = scrollRef.current;
    if (scroll) {
      const bounds = scroll.getBoundingClientRect();
      if (event.clientY < bounds.top + SCROLL_EDGE) scroll.scrollBy(0, -SCROLL_STEP);
      else if (event.clientY > bounds.bottom - SCROLL_EDGE) {
        scroll.scrollBy(0, SCROLL_STEP);
      }
    }

    const target = dropTargetAt(event, tasks);
    if (!target) return setPreview(null);
    const current = previewRef.current;
    if (current?.targetId === target.targetId && current.placement === target.placement) {
      return;
    }
    const next = placeTask(
      graph,
      active.taskId,
      target.targetId,
      target.placement,
      scheduleMode,
    );
    setPreview(next === graph ? null : { ...target, graph: next });
  }

  function endOrder(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const drop = previewRef.current;
    if (drop) {
      onGraphChange(drop.graph);
      if (drop.placement === "inside") onExpand(drop.targetId);
      announce(active.taskId, drop.targetId, drop.placement);
    }
    clearOrder();
  }

  function cancelOrder(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId === event.pointerId) clearOrder();
  }

  function handleOrderKey(event: KeyboardEvent<HTMLButtonElement>, taskId: string) {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const parents = new Map(
      graph.relationships
        .filter((relationship) => relationship.type === "child")
        .map((relationship) => [relationship.targetId, relationship.sourceId]),
    );
    if (event.key === "ArrowLeft") {
      const parentId = parents.get(taskId);
      const parent = graph.nodes.find(
        (node) => node.id === parentId && node.type === "task",
      );
      if (parent) applyOrder(taskId, parent.id, "after");
      return;
    }
    const direction = event.key === "ArrowDown" ? 1 : -1;
    const targetId = visibleSibling(tasks, parents, taskId, direction);
    if (!targetId) return;
    const placement =
      event.key === "ArrowRight" ? "inside" : direction < 0 ? "before" : "after";
    applyOrder(taskId, targetId, placement);
  }

  return {
    preview,
    draggedId,
    announcement,
    beginOrder,
    continueOrder,
    endOrder,
    cancelOrder,
    handleOrderKey,
  };
}
