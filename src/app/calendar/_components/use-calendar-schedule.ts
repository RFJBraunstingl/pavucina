import { type KeyboardEvent, type PointerEvent, useRef } from "react";

import { isTaskSchedulable } from "@/services/task-schedule-mode-service";
import {
  moveScheduledTask,
  setTaskTimes,
} from "@/services/task-schedule-service";
import {
  CALENDAR_END,
  CALENDAR_RESIZE_STEP,
  CALENDAR_START,
  HOUR_HEIGHT,
  resizeTimeRange,
} from "@/utils/calendar";
import { minutesToTime, timeToMinutes } from "@/utils/time";
import type {
  CalendarDragMode,
  CalendarDragState,
  CalendarInteractionOptions,
  CalendarItem,
} from "@/types/calendar";

export function useCalendarSchedule({
  graph,
  scheduleMode,
  days,
  bodyRef,
  onGraphChange,
  onSelect,
}: CalendarInteractionOptions) {
  const drag = useRef<CalendarDragState | null>(null);

  function beginDrag(
    event: PointerEvent<HTMLButtonElement>,
    item: CalendarItem,
    mode: CalendarDragMode,
  ) {
    if (
      event.button !== 0 ||
      !isTaskSchedulable(graph, item.task.id, scheduleMode)
    ) {
      return;
    }
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    onSelect(item.task.id);
    drag.current = {
      pointerId: event.pointerId,
      taskId: item.task.id,
      mode,
      originX: event.clientX,
      originY: event.clientY,
      originGraph: graph,
      startDayIndex: item.dayIndex,
      startTime: item.startTime,
      endTime: item.endTime,
      lastTarget:
        mode === "move"
          ? `${item.startDate}:${timeToMinutes(item.startTime)}`
          : `${item.startTime}:${item.endTime}`,
    };
  }

  function continueDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const offsetY = event.clientY - active.originY;

    if (active.mode !== "move") {
      const amount =
        Math.round(offsetY / (HOUR_HEIGHT / 4)) * CALENDAR_RESIZE_STEP;
      const times = resizeTimeRange(
        active.startTime,
        active.endTime,
        active.mode,
        amount,
      );
      const target = times.join(":");
      if (target === active.lastTarget) return;
      drag.current = { ...active, lastTarget: target };
      onGraphChange(setTaskTimes(active.originGraph, active.taskId, ...times));
      return;
    }

    if (!bodyRef.current) return;
    const dayWidth = bodyRef.current.getBoundingClientRect().width / 7;
    const dayIndex = Math.max(
      0,
      Math.min(
        6,
        active.startDayIndex +
          Math.round((event.clientX - active.originX) / dayWidth),
      ),
    );
    const minutes = Math.max(
      CALENDAR_START,
      Math.min(
        CALENDAR_END - 30,
        timeToMinutes(active.startTime) +
          Math.round(offsetY / (HOUR_HEIGHT / 2)) * 30,
      ),
    );
    const target = `${days[dayIndex]}:${minutes}`;
    if (target === active.lastTarget) return;
    drag.current = { ...active, lastTarget: target };
    onGraphChange(
      moveScheduledTask(
        active.originGraph,
        active.taskId,
        days[dayIndex],
        minutesToTime(minutes),
      ),
    );
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    if (drag.current?.pointerId === event.pointerId) drag.current = null;
  }

  function handleArrow(
    event: KeyboardEvent<HTMLButtonElement>,
    item: CalendarItem,
    mode: CalendarDragMode,
  ) {
    if (!isTaskSchedulable(graph, item.task.id, scheduleMode)) return;
    if (mode !== "move") {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      const times = resizeTimeRange(
        item.startTime,
        item.endTime,
        mode,
        event.key === "ArrowUp" ? -CALENDAR_RESIZE_STEP : CALENDAR_RESIZE_STEP,
      );
      onGraphChange(setTaskTimes(graph, item.task.id, ...times));
      return;
    }

    if (![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
    ].includes(event.key)) return;
    event.preventDefault();
    const horizontal =
      event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    const targetDate = days[item.dayIndex + horizontal];
    if (!targetDate) return;
    const vertical =
      event.key === "ArrowUp" ? -30 : event.key === "ArrowDown" ? 30 : 0;
    const minutes = Math.max(
      CALENDAR_START,
      Math.min(
        CALENDAR_END - 30,
        timeToMinutes(item.startTime) + vertical,
      ),
    );
    onGraphChange(
      moveScheduledTask(
        graph,
        item.task.id,
        targetDate,
        minutesToTime(minutes),
      ),
    );
  }

  return { beginDrag, continueDrag, endDrag, handleArrow };
}
