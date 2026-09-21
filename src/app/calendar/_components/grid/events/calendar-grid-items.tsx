import CalendarEvent from "./calendar-event";
import ExternalCalendarEvent from "./external-calendar-event";
import GraphCalendarEvent from "./graph-calendar-event";
import { calendarResizeEdges } from "@/services/calendar/core/calendar-schedule-service";
import type { CalendarGridItemsProps } from "@/types/calendar/calendar";

export default function CalendarGridItems({
  graph,
  items,
  dayCount,
  selectedId,
  locked,
  onSelect,
  onSelectEvent,
  schedule,
}: CalendarGridItemsProps) {
  return items.map((item) => {
    if ("task" in item ||
      ("eventNode" in item && !item.eventNode.properties.externalOrigin)) {
      const id = "task" in item ? item.task.id : item.eventNode.id;
      return (
        <CalendarEvent
          item={item}
          dayCount={dayCount}
          selected={selectedId === id}
          locked={locked}
          onSelect={() => onSelect(id, item.startDate)}
          onOpen={"eventNode" in item
            ? () => onSelectEvent(item.eventNode.id)
            : undefined}
          {...calendarResizeEdges(graph, item)}
          onDragStart={(event, mode) => schedule.beginDrag(event, item, mode)}
          onPointerMove={schedule.continueDrag}
          onPointerEnd={schedule.endDrag}
          onKeyDown={(event, mode) => schedule.handleArrow(event, item, mode)}
          key={item.id}
        />
      );
    }
    if ("eventNode" in item) {
      return (
        <GraphCalendarEvent
          item={item}
          dayCount={dayCount}
          selected={selectedId === item.eventNode.id}
          onSelect={() => onSelectEvent(item.eventNode.id)}
          key={item.id}
        />
      );
    }
    return (
      <ExternalCalendarEvent
        item={item}
        dayCount={dayCount}
        key={item.id}
      />
    );
  });
}
