import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";

import CalendarAllDay from "./events/calendar-all-day";
import CalendarGridItems from "./events/calendar-grid-items";
import CalendarGridBackground from "./calendar-grid-background";
import CalendarCreatePreview from "./calendar-create-preview";
import { useCalendarSchedule } from "../scheduling/use-calendar-schedule";
import { useCalendarCreation } from "../scheduling/use-calendar-creation";
import {
  CALENDAR_HEIGHT,
  calendarCurrentTimePosition,
  HOUR_HEIGHT,
  HOUR_LABELS,
  layoutCalendarItems,
} from "@/utils/calendar/calendar";
import { dayLabel, dayOfMonth } from "@/utils/shared/date";
import { defaultCalendarEvent } from "@/utils/calendar/calendar-creation";
import { externalCalendarItems } from "@/utils/calendar/external-calendar";
import { importedCalendarItems } from "@/utils/calendar/event-calendar";
import type { CalendarGridProps } from "@/types/calendar/calendar";

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
  const [loadedAt] = useState(() => new Date());
  const currentTimePosition = calendarCurrentTimePosition(days, loadedAt);
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
    onOpenEvent: onSelectEvent,
    locked,
  });

  useEffect(() => {
    if (scroll.current) {
      scroll.current.scrollTop = Math.max(
        0,
        ((loadedAt.getHours() * 60 + loadedAt.getMinutes()) / 60 - 1) * HOUR_HEIGHT,
      );
    }
  }, [loadedAt]);

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
          locked={locked}
          creating={creating}
          onSelect={onSelectEvent}
          onCreate={(date) => onCreateEvent({
            ...defaultCalendarEvent(items, date), allDay: true,
          })}
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
            tabIndex={locked ? -1 : 0}
            aria-keyshortcuts="Enter"
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.target !== event.currentTarget ||
                event.repeat || locked || creating) return;
              event.preventDefault();
              onCreateEvent(defaultCalendarEvent(items, days.includes(today) ? today : days[0]));
            }}
            onPointerMove={(event) => {
              schedule.continueDrag(event);
              creation.move(event);
            }}
            onPointerUp={schedule.endDrag}
            onPointerDown={creation.begin}
            onPointerLeave={creation.leave}
            onPointerCancel={(event) => {
              schedule.endDrag(event);
              creation.clear();
            }}
            onClick={creation.click}
          >
            <CalendarGridBackground
              days={days}
              currentTimePosition={currentTimePosition}
            />
            {preview && (
              <CalendarCreatePreview preview={preview} days={days} />
            )}
            <CalendarGridItems
              graph={graph}
              items={items}
              dayCount={days.length}
              selectedId={selectedId}
              locked={locked}
              onSelect={onSelect}
              onSelectEvent={onSelectEvent}
              schedule={schedule}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
