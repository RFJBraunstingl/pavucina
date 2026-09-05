import { type KeyboardEvent, type PointerEvent, useRef } from "react";

import { isTaskSchedulable } from "@/services/task-schedule-mode-service";
import {
  moveTask,
  resizeTask,
  setTaskDates,
} from "@/services/task-schedule-service";
import type {
  DragMode,
  DragState,
  TimelineInteractionOptions,
} from "@/types/timeline";

const DAY_WIDTH = 48;

export function useTimelineSchedule({
  graph,
  scheduleMode,
  onGraphChange,
  onSelect,
}: TimelineInteractionOptions) {
  const drag = useRef<DragState | null>(null);

  function changeTask(taskId: string, mode: DragMode, amount: number) {
    if (!isTaskSchedulable(graph, taskId, scheduleMode)) return;
    onGraphChange(
      mode === "move"
        ? moveTask(graph, taskId, amount)
        : resizeTask(graph, taskId, mode, amount),
    );
  }

  function scheduleTask(taskId: string, day: string) {
    if (!isTaskSchedulable(graph, taskId, scheduleMode)) return;
    onGraphChange(setTaskDates(graph, taskId, day, day));
    onSelect(taskId);
  }

  function beginDrag(
    event: PointerEvent<HTMLButtonElement>,
    taskId: string,
    mode: DragMode,
  ) {
    if (
      event.button !== 0 ||
      !isTaskSchedulable(graph, taskId, scheduleMode)
    ) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      taskId,
      mode,
      originX: event.clientX,
      originGraph: graph,
      lastAmount: 0,
    };
    onSelect(taskId);
  }

  function continueDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const amount = Math.round((event.clientX - active.originX) / DAY_WIDTH);
    if (amount === active.lastAmount) return;
    drag.current = { ...active, lastAmount: amount };
    onGraphChange(
      active.mode === "move"
        ? moveTask(active.originGraph, active.taskId, amount)
        : resizeTask(active.originGraph, active.taskId, active.mode, amount),
    );
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function handleArrow(
    event: KeyboardEvent<HTMLButtonElement>,
    taskId: string,
    mode: DragMode,
  ) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    changeTask(taskId, mode, event.key === "ArrowLeft" ? -1 : 1);
  }

  return { scheduleTask, beginDrag, continueDrag, endDrag, handleArrow };
}
