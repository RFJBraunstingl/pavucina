import { type CSSProperties, useEffect, useRef } from "react";

import CalendarEvent from "../../calendar/_components/calendar-event";
import { useCalendarSchedule } from "../../calendar/_components/use-calendar-schedule";
import { moveTaskWithinDay } from "@/services/task-day-schedule-service";
import { HOUR_HEIGHT } from "@/utils/calendar";
import {
  DAY_END,
  DAY_HEIGHT,
  DAY_HOUR_LABELS,
  DAY_START,
} from "@/utils/day-schedule";
import { dayLabel, dayOfMonth } from "@/utils/date";
import type { ScheduleGridProps } from "@/types/schedule";

export default function ScheduleGrid({
  graph,
  scheduleMode,
  days,
  today,
  events,
  selectedId,
  bodyRef,
  onGraphChange,
  onSelect,
}: ScheduleGridProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const schedule = useCalendarSchedule({
    graph,
    scheduleMode,
    days,
    bodyRef,
    startMinute: DAY_START,
    endMinute: DAY_END,
    moveTask: moveTaskWithinDay,
    onGraphChange,
    onSelect: (taskId) => onSelect(
      taskId,
      events.find((event) => event.task.id === taskId)?.startDate ?? days[0],
    ),
  });

  useEffect(() => {
    const now = new Date();
    if (scroll.current) {
      scroll.current.scrollTop =
        ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_HEIGHT;
    }
  }, []);

  return (
    <div
      className="schedule-day"
      style={{ "--schedule-days": days.length } as CSSProperties}
    >
      <div className="calendar-scroll" ref={scroll}>
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
            <div className="calendar-times" style={{ height: DAY_HEIGHT }}>
              {DAY_HOUR_LABELS.map((time) => <span key={time}>{time}</span>)}
            </div>
            <div
              className="calendar-days"
              ref={bodyRef}
              style={{ height: DAY_HEIGHT }}
              role="region"
              aria-label={`24 hour schedule from ${days[0]} to ${days.at(-1)}`}
            >
              {days.map((day) => <div className="calendar-day" key={day} />)}
              {DAY_HOUR_LABELS.map((time, index) => (
                <div className="calendar-hour-line" style={{ top: index * HOUR_HEIGHT }} key={time} />
              ))}
              {events.map((item) => (
                <CalendarEvent
                  item={item}
                  dayCount={days.length}
                  selected={selectedId === item.task.id}
                  onSelect={() => onSelect(item.task.id, item.startDate)}
                  key={item.task.id}
                  onDragStart={(event, mode) => schedule.beginDrag(event, item, mode)}
                  onPointerMove={schedule.continueDrag}
                  onPointerEnd={schedule.endDrag}
                  onKeyDown={(event, mode) => schedule.handleArrow(event, item, mode)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
