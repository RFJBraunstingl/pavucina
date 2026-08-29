import {
  type KeyboardEvent,
  type PointerEvent,
  useMemo,
  useRef,
} from "react";

import CalendarEvent from "./calendar-event";
import { flattenTasks } from "@/services/task-service";
import {
  getTaskDate,
  getTaskTime,
  moveScheduledTask,
} from "@/services/task-schedule-service";
import {
  calendarItem,
  CALENDAR_END,
  CALENDAR_START,
  HOUR_HEIGHT,
  HOUR_LABELS,
} from "@/utils/calendar";
import { dayLabel, dayOfMonth } from "@/utils/date";
import { timeToMinutes, minutesToTime } from "@/utils/time";
import type {
  CalendarDragState,
  CalendarGridProps,
} from "@/types/calendar";

export default function CalendarGrid({
  graph,
  days,
  today,
  onGraphChange,
}: CalendarGridProps) {
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<CalendarDragState | null>(null);
  const items = useMemo(
    () =>
      flattenTasks(graph).flatMap(({ task }) => {
        const startDate = getTaskDate(graph, task.id, "plannedStartDate");
        const endDate = getTaskDate(graph, task.id, "plannedEndDate");
        if (!startDate || !endDate) return [];
        const item = calendarItem(
          task,
          startDate,
          endDate,
          getTaskTime(graph, task.id, "plannedStartTime") ?? "09:00",
          getTaskTime(graph, task.id, "plannedEndTime") ?? "10:00",
          days[0],
        );
        return item ? [item] : [];
      }),
    [days, graph],
  );

  function beginDrag(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (event.button !== 0) return;
    const item = items[index];
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = {
      pointerId: event.pointerId,
      taskId: item.task.id,
      originX: event.clientX,
      originY: event.clientY,
      originGraph: graph,
      startDayIndex: item.dayIndex,
      startTime: item.startTime,
      lastTarget: `${item.startDate}:${timeToMinutes(item.startTime)}`,
    };
  }

  function continueDrag(event: PointerEvent<HTMLButtonElement>) {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId || !body.current) return;
    const dayWidth = body.current.getBoundingClientRect().width / 7;
    const dayIndex = Math.max(
      0,
      Math.min(6, active.startDayIndex + Math.round((event.clientX - active.originX) / dayWidth)),
    );
    const minutes = Math.max(
      CALENDAR_START,
      Math.min(
        CALENDAR_END - 30,
        timeToMinutes(active.startTime) +
          Math.round((event.clientY - active.originY) / (HOUR_HEIGHT / 2)) * 30,
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

  function moveWithKeyboard(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    const item = items[index];
    const horizontal = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    const targetDate = days[item.dayIndex + horizontal];
    if (!targetDate) return;
    const vertical = event.key === "ArrowUp" ? -30 : event.key === "ArrowDown" ? 30 : 0;
    const minutes = Math.max(
      CALENDAR_START,
      Math.min(CALENDAR_END - 30, timeToMinutes(item.startTime) + vertical),
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

  return (
    <div className="calendar-scroll">
      <div className="calendar-week">
        <div className="calendar-days-header">
          <div className="calendar-corner" />
          {days.map((day) => (
            <div className={day === today ? "today" : ""} key={day}>
              <span>{dayLabel(day)}</span>
              <strong>{dayOfMonth(day)}</strong>
            </div>
          ))}
        </div>
        <div className="calendar-body">
          <div className="calendar-times">
            {HOUR_LABELS.map((time) => <span key={time}>{time}</span>)}
          </div>
          <div className="calendar-days" ref={body}>
            {days.map((day) => <div className="calendar-day" key={day} />)}
            {HOUR_LABELS.map((time, index) => (
              <div className="calendar-hour-line" style={{ top: index * HOUR_HEIGHT }} key={time} />
            ))}
            {items.map((item, index) => (
              <CalendarEvent
                item={item}
                key={item.task.id}
                onPointerDown={(event) => beginDrag(event, index)}
                onPointerMove={continueDrag}
                onPointerEnd={endDrag}
                onKeyDown={(event) => moveWithKeyboard(event, index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
