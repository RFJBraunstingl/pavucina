import { type KeyboardEvent, type PointerEvent, useRef } from "react";

import {
  calendarKeyboardTarget,
  calendarPointerTarget,
  calendarResizeAmount,
} from "./calendar-drag-target";
import {
  canRescheduleCalendarItem,
  moveCalendarItem,
  resizeCalendarItem,
} from "@/services/calendar/core/calendar-schedule-service";
import {
  CALENDAR_RESIZE_STEP,
} from "@/utils/calendar/calendar";
import { timeToMinutes } from "@/utils/shared/time";
import type {
  CalendarDragMode,
  CalendarDragState,
  CalendarInteractionOptions,
  EditableCalendarItem,
} from "@/types/calendar/calendar";

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
    if (active.mode !== "move") {
      const amount = calendarResizeAmount(event.clientY - active.originY);
      const target = String(amount);
      if (target === active.lastTarget) return;
      drag.current = { ...active, lastTarget: target };
      onGraphChange(resizeCalendarItem(active.originGraph, active.item, active.mode, amount));
      return;
    }

    if (!bodyRef.current) return;
    const target = calendarPointerTarget(
      active,
      event,
      days,
      bodyRef.current.getBoundingClientRect().width,
    );
    if (target.key === active.lastTarget) return;
    drag.current = { ...active, lastTarget: target.key };
    onGraphChange(
      moveCalendarItem(
        active.originGraph,
        active.item,
        target.date,
        target.time,
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
    const target = calendarKeyboardTarget(event.key, item, days);
    if (!target) return;
    onGraphChange(
      moveCalendarItem(
        graph,
        item,
        target.date,
        target.time,
      ),
    );
  }

  return { beginDrag, continueDrag, endDrag, handleArrow };
}
