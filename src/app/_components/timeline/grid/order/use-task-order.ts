import {
  type KeyboardEvent,
  type PointerEvent,
  useRef,
  useState,
} from "react";

import {
  dropTargetAt,
  isTaskOrderKey,
  keyboardOrderTarget,
  scrollTaskListNearEdge,
  taskName,
} from "./task-order-utils";
import { placeTask } from "@/services/task/ordering/task-order-service";
import type { TaskPlacement } from "@/types/graph/graph";
import type {
  TaskDropPreview,
  TaskOrderDragState,
  TaskOrderOptions,
} from "@/types/timeline/timeline-interaction";

const DRAG_THRESHOLD = 4;

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

    scrollTaskListNearEdge(scrollRef.current, event.clientY);

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
    if (!isTaskOrderKey(event.key)) return;
    event.preventDefault();
    const target = keyboardOrderTarget(
      graph,
      tasks,
      taskId,
      event.key,
    );
    if (target) applyOrder(taskId, target.targetId, target.placement);
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
