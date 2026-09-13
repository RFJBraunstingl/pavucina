import { type CSSProperties, useEffect, useMemo, useRef } from "react";

import CalendarEvent from "./calendar-event";
import CalendarAllDay from "./calendar-all-day";
import ExternalCalendarEvent from "./external-calendar-event";
import GraphCalendarEvent from "./graph-calendar-event";
import { useCalendarSchedule } from "./use-calendar-schedule";
import { useCalendarCreation } from "./use-calendar-creation";
import {
  CALENDAR_HEIGHT,
  HOUR_HEIGHT,
  HOUR_LABELS,
  layoutCalendarItems,
} from "@/utils/calendar";
import { dayLabel, dayOfMonth, isWeekend } from "@/utils/date";
import { externalCalendarItems } from "@/utils/external-calendar";
import { importedCalendarItems } from "@/utils/event-calendar";
import { minutesBetweenDateTimes, timeToMinutes } from "@/utils/time";
import type { CalendarGridProps } from "@/types/calendar";

export default function CalendarGrid({
  graph,
  scheduleMode,
  days,
  today,
  taskEvents,
  externalEvents,
  graphEvents,
  selectedId,
  locked,
  bodyRef,
  onGraphChange,
  onSelect,
  onSelectEvent,
  onCreateEvent,
  creating,
}: CalendarGridProps) {
  const scroll = useRef<HTMLDivElement>(null);
  const items = useMemo(
    () => layoutCalendarItems([
      ...taskEvents,
      ...importedCalendarItems(graph, graphEvents, days),
      ...externalCalendarItems(externalEvents, days),
    ]),
    [days, externalEvents, graph, graphEvents, taskEvents],
  );
  const creation = useCalendarCreation({ items, days, locked, creating, bodyRef, onCreate: onCreateEvent });
  const preview = creation.preview;
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
    <div className="calendar-scroll" ref={scroll} onScroll={creation.clear}>
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
          importedEvents={graphEvents}
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
            onPointerMove={creation.move}
            onPointerDown={creation.begin}
            onPointerLeave={creation.leave}
            onPointerCancel={creation.clear}
            onClick={creation.click}
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
            {preview && (
              <div className="calendar-create-preview" aria-hidden="true" style={{
                top: timeToMinutes(preview.startTime) / 60 * HOUR_HEIGHT,
                height: minutesBetweenDateTimes(preview.startDate, preview.startTime,
                  preview.endDate, preview.endTime) / 60 * HOUR_HEIGHT,
                left: `${days.indexOf(preview.startDate) / days.length * 100}%`,
                width: `${100 / days.length}%`,
              }}>
                <strong>+ New event</strong>
                <span>{preview.startTime} – {preview.endTime}</span>
              </div>
            )}
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
              <GraphCalendarEvent
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
