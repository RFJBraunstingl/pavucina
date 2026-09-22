import {
  type CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import CalendarAllDay from "./events/calendar-all-day";
import CalendarGridItems from "./events/calendar-grid-items";
import CalendarGridBackground from "./calendar-grid-background";
import CalendarCreatePreview from "./calendar-create-preview";
import CalendarDaysHeader from "./calendar-days-header";
import { useCalendarGridInteractions } from "../scheduling/grid/use-calendar-grid-interactions";
import {
  CALENDAR_HEIGHT,
  calendarCurrentTimePosition,
  HOUR_HEIGHT,
  HOUR_LABELS,
} from "@/utils/calendar/calendar";
import { layoutCalendarItems } from "@/utils/calendar/calendar-layout";
import { externalCalendarItems } from "@/utils/calendar/events/external-calendar-layout";
import { graphCalendarItems } from "@/utils/calendar/events/graph-calendar";
import type { CalendarGridProps } from "@/types/calendar/calendar-components";

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
      ...graphCalendarItems(graph, graphEvents, days),
      ...externalCalendarItems(externalEvents, days),
    ]),
    [days, externalEvents, graph, graphEvents, taskEvents],
  );
  const interactions = useCalendarGridInteractions({
    graph,
    scheduleMode,
    items,
    days,
    today,
    locked,
    creating,
    bodyRef,
    onGraphChange,
    onSelect,
    onOpenEvent: onSelectEvent,
    onCreate: onCreateEvent,
  });
  const { creation, schedule } = interactions;
  const preview = creation.preview;

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
        <CalendarDaysHeader days={days} today={today} />
        <CalendarAllDay
          days={days}
          externalEvents={externalEvents}
          importedEvents={graphEvents}
          graph={graph}
          selectedId={selectedId}
          locked={locked}
          creating={creating}
          onSelect={onSelectEvent}
          onCreate={interactions.createAllDayEvent}
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
            onKeyDown={interactions.createEventWithKeyboard}
            onPointerMove={interactions.continuePointerInteraction}
            onPointerUp={schedule.endDrag}
            onPointerDown={creation.begin}
            onPointerLeave={creation.leave}
            onPointerCancel={interactions.cancelPointerInteraction}
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
