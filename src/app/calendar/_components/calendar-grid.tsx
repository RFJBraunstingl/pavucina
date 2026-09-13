import { type CSSProperties, useEffect, useMemo, useRef } from "react";

import CalendarEvent from "./calendar-event";
import CalendarAllDay from "./calendar-all-day";
import ExternalCalendarEvent from "./external-calendar-event";
import ImportedCalendarEvent from "./imported-calendar-event";
import { useCalendarSchedule } from "./use-calendar-schedule";
import {
  CALENDAR_HEIGHT,
  HOUR_HEIGHT,
  HOUR_LABELS,
  layoutCalendarItems,
} from "@/utils/calendar";
import { dayLabel, dayOfMonth, isWeekend } from "@/utils/date";
import { externalCalendarItems } from "@/utils/external-calendar";
import { importedCalendarItems } from "@/utils/event-calendar";
import type { CalendarGridProps } from "@/types/calendar";

export default function CalendarGrid({
  graph,
  scheduleMode,
  days,
  today,
  taskEvents,
  externalEvents,
  importedEvents,
  selectedId,
  locked,
  bodyRef,
  onGraphChange,
  onSelect,
  onSelectEvent,
}: CalendarGridProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () => layoutCalendarItems([
      ...taskEvents,
      ...importedCalendarItems(graph, importedEvents, days),
      ...externalCalendarItems(externalEvents, days),
    ]),
    [days, externalEvents, graph, importedEvents, taskEvents],
  );
  const schedule = useCalendarSchedule({
    graph,
    scheduleMode,
    days,
    bodyRef,
    onGraphChange,
    onSelect,
  });

  useEffect(() => {
    const now = new Date();
    if (scroll.current) {
      scroll.current.scrollTop = Math.max(
        0,
        ((now.getHours() * 60 + now.getMinutes()) / 60 - 1) * HOUR_HEIGHT,
      );
    }
  }, []);

  return (
    <div className="calendar-scroll" ref={scroll}>
      <div
        className={`calendar-week${days.length === 1 ? " single-day" : ""}`}
        style={{ "--calendar-days": days.length } as CSSProperties}
      >
        <div className="calendar-days-header">
          <div className="calendar-corner" />
          {days.map((day) => (
            <div className={day === today ? "today" : ""} key={day}>
              <span>{dayLabel(day)}</span>
              <strong>{dayOfMonth(day)}</strong>
            </div>
          ))}
        </div>
        <CalendarAllDay
          days={days}
          externalEvents={externalEvents}
          importedEvents={importedEvents}
          graph={graph}
          selectedId={selectedId}
          onSelect={onSelectEvent}
        />
        <div className="calendar-body">
          <div className="calendar-times" style={{ height: CALENDAR_HEIGHT }}>
            {HOUR_LABELS.map((time) => <span key={time}>{time}</span>)}
          </div>
          <div
            className="calendar-days"
            ref={bodyRef}
            style={{ height: CALENDAR_HEIGHT }}
            role="region"
            aria-label={`24 hour calendar from ${days[0]} to ${days.at(-1)}`}
          >
            {days.map((day) => (
              <div
                className={`calendar-day${isWeekend(day) ? " weekend" : ""}`}
                key={day}
              />
            ))}
            {HOUR_LABELS.map((time, index) => (
              <div className="calendar-hour-line" style={{ top: index * HOUR_HEIGHT }} key={time} />
            ))}
            {items.map((item) => "task" in item ? (
              <CalendarEvent
                item={item}
                dayCount={days.length}
                selected={selectedId === item.task.id}
                locked={locked}
                onSelect={() => onSelect(item.task.id, item.startDate)}
                key={item.id}
                onDragStart={(event, mode) => schedule.beginDrag(event, item, mode)}
                onPointerMove={schedule.continueDrag}
                onPointerEnd={schedule.endDrag}
                onKeyDown={(event, mode) => schedule.handleArrow(event, item, mode)}
              />
            ) : "eventNode" in item ? (
              <ImportedCalendarEvent
                item={item}
                dayCount={days.length}
                selected={selectedId === item.eventNode.id}
                onSelect={() => onSelectEvent(item.eventNode.id)}
                key={item.id}
              />
            ) : (
              <ExternalCalendarEvent
                item={item}
                dayCount={days.length}
                key={item.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
