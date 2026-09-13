import { getEventDate } from "@/services/event-service";
import { calendarSourceLabel } from "@/utils/external-calendar";
import type { EventNode } from "@/types/event";
import type { Graph } from "@/types/graph";

export default function EventInspector({ graph, event }: {
  graph: Graph;
  event: EventNode;
}) {
  const start = getEventDate(graph, event.id, "eventStartDate");
  const end = getEventDate(graph, event.id, "eventEndDate");
  const properties = event.properties;
  const schedule = properties.allDay
    ? `${start}${end !== start ? ` – ${end}` : ""} · All day`
    : `${start} ${properties.startTime} – ${end} ${properties.endTime}`;
  return (
    <aside className="inspector event-inspector">
      <p className="eyebrow">Calendar event</p>
      <h2>{properties.name}</h2>
      <dl>
        <div><dt>When</dt><dd>{schedule}</dd></div>
        <div><dt>Calendar</dt><dd>{properties.calendarName}</dd></div>
        <div><dt>Provider</dt><dd>{calendarSourceLabel(properties.externalOrigin.source)}</dd></div>
        {properties.location && <div><dt>Location</dt><dd>{properties.location}</dd></div>}
        {properties.description && <div><dt>Description</dt><dd>{properties.description}</dd></div>}
      </dl>
      {properties.sourceUrl && (
        <a href={properties.sourceUrl} target="_blank" rel="noreferrer">
          Open in source calendar
        </a>
      )}
      <p className="inspector-help">Imported events are read-only in Pavucina.</p>
    </aside>
  );
}
