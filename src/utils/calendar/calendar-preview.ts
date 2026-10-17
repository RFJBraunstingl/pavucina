import { calendarItem } from "./calendar.ts";
import { layoutCalendarItems } from "./calendar-layout.ts";
import { graphCalendarItems } from "./events/graph-calendar.ts";
import { getTaskDate } from "@/services/task/scheduling/dates/task-date-service.ts";
import type { CalendarDisplayItem } from "@/types/calendar/calendar-layout";
import type { CalendarDragPreview } from "@/types/calendar/calendar-interaction";

export function previewCalendarItems(
  items: CalendarDisplayItem[],
  { graph, item, days }: CalendarDragPreview,
) {
  const id = "task" in item ? item.task.id : item.eventNode.id;
  const remaining = items.filter((candidate) =>
    "task" in candidate ? candidate.task.id !== id :
      "eventNode" in candidate ? candidate.eventNode.id !== id : true,
  );
  const node = graph.nodes.find((candidate) => candidate.id === id);
  if (node?.type === "event") {
    return layoutCalendarItems([...remaining, ...graphCalendarItems(graph, [node], days)]);
  }
  if (node?.type !== "task") return items;
  const start = getTaskDate(graph, id, "plannedStartDate");
  const end = getTaskDate(graph, id, "plannedEndDate");
  const { plannedStartTime, plannedEndTime } = node.properties;
  const positioned = start && end && plannedStartTime && plannedEndTime && days.includes(start)
    ? calendarItem(node, start, end, plannedStartTime, plannedEndTime, days[0]) : null;
  return layoutCalendarItems([...remaining, ...(positioned ? [positioned] : [])]);
}
