import TaskInspector from "@/app/_components/task/task-inspector";
import EventInspector from "./editor/event-inspector";
import type { CalendarInspectorProps } from "@/types/calendar/calendar-components";

export default function CalendarInspector({
  graph,
  selectedId,
  scheduleMode,
  scheduleDate,
  onEditEvent,
  onDeleteTask,
}: CalendarInspectorProps) {
  const selected = graph.nodes.find((node) => node.id === selectedId);
  return selected?.type === "event" ? (
    <EventInspector
      graph={graph}
      event={selected}
      onEdit={() => onEditEvent(selected.id)}
    />
  ) : (
    <TaskInspector
      selectedId={selectedId}
      scheduleMode={scheduleMode}
      scheduleDate={scheduleDate}
      helpText="Move or resize the event, or enter exact times above."
      onDeleted={onDeleteTask}
    />
  );
}
