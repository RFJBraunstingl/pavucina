import { type KeyboardEvent, type PointerEvent, useRef } from "react";

import {
  canRescheduleCalendarItem,
  moveCalendarItem,
  resizeCalendarItem,
} from "@/services/calendar-schedule-service";
import {
  CALENDAR_END,
  CALENDAR_RESIZE_STEP,
  CALENDAR_START,
  HOUR_HEIGHT,
} from "@/utils/calendar";
import { minutesToTime, timeToMinutes } from "@/utils/time";
import type {
  CalendarDragMode,
  CalendarDragState,
  CalendarInteractionOptions,
  EditableCalendarItem,
} from "@/types/calendar";

export function useCalendarSchedule({
  graph,
  scheduleMode,
  days,
  bodyRef,
  onGraphChange,
  onSelect,
  onOpenEvent,
  locked,
}: CalendarInteractionOptions) {
  const drag = useRef<CalendarDragState | null>(null);

  function beginDrag(
    event: PointerEvent<HTMLButtonElement>,
    item: EditableCalendarItem,
    mode: CalendarDragMode,
  ) {
    if (
      event.button !== 0 || locked ||
      !canRescheduleCalendarItem(graph, item, scheduleMode)
    ) {
      return;
    }
    event.stopPropagation();
    // Native events can gain or lose day segments; capture on the stable grid.
    const capture = "eventNode" in item ? bodyRef.current : event.currentTarget;
    if (!capture) return;
    capture.setPointerCapture(event.pointerId);
    onSelect("task" in item ? item.task.id : item.eventNode.id, item.startDate);
    drag.current = {
      pointerId: event.pointerId,
      item,
      mode,
      originX: event.clientX,
      originY: event.clientY,
      originGraph: graph,
      startDayIndex: item.dayIndex,
      startTime: item.startTime,
      lastTarget:
        mode === "move"
          ? `${item.startDate}:${timeToMinutes(item.startTime)}`
          : "0",
      moved: false,
    };
  }

  function continueDrag(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId || locked) return;
    if (Math.hypot(event.clientX - active.originX, event.clientY - active.originY) > 5) {
      active.moved = true;
    }
    const offsetY = event.clientY - active.originY;

    if (active.mode !== "move") {
      const amount =
        Math.round(offsetY / (HOUR_HEIGHT / 4)) * CALENDAR_RESIZE_STEP;
      const target = String(amount);
      if (target === active.lastTarget) return;
      drag.current = { ...active, lastTarget: target };
      onGraphChange(resizeCalendarItem(active.originGraph, active.item, active.mode, amount));
      return;
    }

    if (!bodyRef.current) return;
    const dayWidth = bodyRef.current.getBoundingClientRect().width / days.length;
    const dayIndex = Math.max(
      0,
      Math.min(
        days.length - 1,
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
      moveCalendarItem(
        active.originGraph,
        active.item,
        days[dayIndex],
        minutesToTime(minutes),
      ),
    );
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.type === "pointerup" && !locked && !active.moved &&
      active.mode === "move" && "eventNode" in active.item) {
      onOpenEvent(active.item.eventNode.id);
    }
  }

  function handleArrow(
    event: KeyboardEvent<HTMLButtonElement>,
    item: EditableCalendarItem,
    mode: CalendarDragMode,
  ) {
    if (locked || !canRescheduleCalendarItem(graph, item, scheduleMode)) return;
    if (mode !== "move") {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      onGraphChange(resizeCalendarItem(graph, item, mode,
        event.key === "ArrowUp" ? -CALENDAR_RESIZE_STEP : CALENDAR_RESIZE_STEP,
      ));
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
      moveCalendarItem(
        graph,
        item,
        targetDate,
        minutesToTime(minutes),
      ),
    );
  }

  return { beginDrag, continueDrag, endDrag, handleArrow };
}
