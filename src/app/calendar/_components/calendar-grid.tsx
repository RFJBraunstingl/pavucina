import { useMemo, useRef } from "react";

import CalendarEvent from "./calendar-event";
import { useCalendarSchedule } from "./use-calendar-schedule";
import { flattenTasks } from "@/services/task-service";
import {
  getTaskDate,
  getTaskTime,
} from "@/services/task-schedule-service";
import {
  calendarItem,
  CALENDAR_HEIGHT,
  HOUR_HEIGHT,
  HOUR_LABELS,
} from "@/utils/calendar";
import { dayLabel, dayOfMonth } from "@/utils/date";
import type { CalendarGridProps } from "@/types/calendar";

export default function CalendarGrid({
  graph,
  days,
  today,
  hideDone,
  selectedId,
  onGraphChange,
  onSelect,
}: CalendarGridProps) {
  const body = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () =>
      flattenTasks(graph)
        .filter(({ task }) => !hideDone || !task.properties.done)
        .flatMap(({ task }) => {
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
    [days, graph, hideDone],
  );
  const schedule = useCalendarSchedule({
    graph,
    days,
    bodyRef: body,
    onGraphChange,
    onSelect,
  });

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
          <div className="calendar-times" style={{ height: CALENDAR_HEIGHT }}>
            {HOUR_LABELS.map((time) => <span key={time}>{time}</span>)}
          </div>
          <div
            className="calendar-days"
            ref={body}
            style={{ height: CALENDAR_HEIGHT }}
          >
            {days.map((day) => <div className="calendar-day" key={day} />)}
            {HOUR_LABELS.map((time, index) => (
              <div className="calendar-hour-line" style={{ top: index * HOUR_HEIGHT }} key={time} />
            ))}
            {items.map((item) => (
              <CalendarEvent
                item={item}
                selected={selectedId === item.task.id}
                onSelect={() => onSelect(item.task.id)}
                key={item.task.id}
                onDragStart={(event, mode) =>
                  schedule.beginDrag(event, item, mode)
                }
                onPointerMove={schedule.continueDrag}
                onPointerEnd={schedule.endDrag}
                onKeyDown={(event, mode) =>
                  schedule.handleArrow(event, item, mode)
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
