import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

import { calendarKeyboardTarget, calendarPointerTarget } from "./calendar-drag-target";
import {
  canRescheduleCalendarItem,
  moveCalendarItem,
  resizeCalendarItem,
} from "@/services/calendar/core/calendar-schedule-service";
import { CALENDAR_RESIZE_STEP } from "@/utils/calendar/calendar";
import { calendarGridPoint } from "@/utils/calendar/calendar-pointer";
import { timeToMinutes } from "@/utils/shared/temporal/time";
import type { Graph } from "@/types/graph/graph";
import type {
  CalendarDragMode,
  CalendarDragPreview,
  CalendarDragState,
  CalendarDragTarget,
  CalendarInteractionOptions,
} from "@/types/calendar/calendar-interaction";
import type { EditableCalendarItem } from "@/types/calendar/calendar-layout";

export function useCalendarSchedule({
  graph, scheduleMode, days, bodyRef, onGraphChange, onSelect, onOpenEvent, locked,
}: CalendarInteractionOptions) {
  const drag = useRef<CalendarDragState | null>(null);
  const frame = useRef<number | null>(null);
  const [preview, setPreview] = useState<CalendarDragPreview | null>(null);

  const clearDrag = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
    const active = drag.current;
    drag.current = null;
    if (active?.captureTarget.hasPointerCapture(active.pointerId)) {
      active.captureTarget.releasePointerCapture(active.pointerId);
    }
    setPreview(null);
  }, []);

  useEffect(() => clearDrag, [days, locked, clearDrag]);

  function beginDrag(event: PointerEvent<HTMLButtonElement>, item: EditableCalendarItem, mode: CalendarDragMode) {
    const body = bodyRef.current;
    if (event.button !== 0 || locked || !body ||
      !canRescheduleCalendarItem(graph, item, scheduleMode)) return;
    event.stopPropagation();
    clearDrag();
    body.setPointerCapture(event.pointerId);
    onSelect("task" in item ? item.task.id : item.eventNode.id, item.startDate);
    drag.current = {
      pointerId: event.pointerId, item, mode, originGraph: graph, days,
      captureTarget: body,
      originX: event.clientX,
      originY: event.clientY,
      originMinutes: calendarGridPoint(event, body.getBoundingClientRect(), days.length).minutes,
      position: { clientX: event.clientX, clientY: event.clientY },
      lastTarget: mode === "move" ? `${item.startDate}:${timeToMinutes(item.startTime)}` : "0",
      moved: false,
    };
  }

  function updateGraph(current: Graph, active: CalendarDragState, target: CalendarDragTarget) {
    if (!canRescheduleCalendarItem(current, active.item, scheduleMode)) {
      console.warn("Calendar drag cancelled: the item no longer exists or cannot be edited.");
      return current;
    }
    return active.mode === "move"
      ? moveCalendarItem(current, active.item, target.date, target.time)
      : resizeCalendarItem(current, active.item, active.mode, target.amount);
  }

  function continueDrag(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    if (locked || active.days !== days || !canRescheduleCalendarItem(graph, active.item, scheduleMode)) {
      console.warn("Calendar drag cancelled: the calendar or editable item changed.");
      clearDrag();
      return;
    }
    active.position = { clientX: event.clientX, clientY: event.clientY };
    active.moved ||= Math.hypot(event.clientX - active.originX, event.clientY - active.originY) > 5;
    if (!active.moved || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const body = bodyRef.current;
      if (drag.current !== active || !body) return;
      const target = calendarPointerTarget(active, active.position, days, body.getBoundingClientRect());
      if (target.key === active.lastTarget) return;
      active.lastTarget = target.key;
      setPreview({ graph: updateGraph(active.originGraph, active, target), item: active.item, days });
    });
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const body = bodyRef.current;
    clearDrag();
    if (event.type !== "pointerup") return;
    if (locked || active.days !== days || !body) {
      console.warn("Calendar drag cancelled: the calendar is no longer available for editing.");
      return;
    }
    const moved = active.moved || Math.hypot(event.clientX - active.originX, event.clientY - active.originY) > 5;
    if (!moved) {
      if (active.mode === "move" && "eventNode" in active.item) onOpenEvent(active.item.eventNode.id);
      return;
    }
    const target = calendarPointerTarget(active, event, days, body.getBoundingClientRect());
    const unchanged = active.mode === "move"
      ? target.date === active.item.startDate && target.time === active.item.startTime
      : target.amount === 0;
    if (!unchanged) onGraphChange((current) => current ? updateGraph(current, active, target) : current);
  }

  function handleArrow(event: KeyboardEvent<HTMLButtonElement>, item: EditableCalendarItem, mode: CalendarDragMode) {
    if (locked || !canRescheduleCalendarItem(graph, item, scheduleMode)) return;
    if (mode !== "move") {
      if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
      event.preventDefault();
      onGraphChange((current) => current ? resizeCalendarItem(current, item, mode,
        event.key === "ArrowUp" ? -CALENDAR_RESIZE_STEP : CALENDAR_RESIZE_STEP,
      ) : current);
      return;
    }
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    event.preventDefault();
    const target = calendarKeyboardTarget(event.key, item, days);
    if (target) onGraphChange((current) => current ? moveCalendarItem(current, item, target.date, target.time) : current);
  }

  return {
    beginDrag, continueDrag, endDrag, handleArrow,
    preview: !locked && preview?.days === days && canRescheduleCalendarItem(graph, preview.item, scheduleMode)
      ? preview : null,
  };
}
