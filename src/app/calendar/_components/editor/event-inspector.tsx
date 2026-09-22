import { getEventDate } from "@/services/event/event-service";
import { calendarSourceLabel } from "@/utils/calendar/events/external-calendar-source";
import type { EventInspectorProps } from "@/types/calendar/events/event";

export default function EventInspector({ graph, event, onEdit }: EventInspectorProps) {
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
        {properties.externalOrigin && (
          <div><dt>Provider</dt><dd>{calendarSourceLabel(properties.externalOrigin.source)}</dd></div>
        )}
        {properties.location && <div><dt>Location</dt><dd>{properties.location}</dd></div>}
        {properties.description && <div><dt>Description</dt><dd>{properties.description}</dd></div>}
      </dl>
      {properties.sourceUrl && (
        <a href={properties.sourceUrl} target="_blank" rel="noreferrer">
          Open in source calendar
        </a>
      )}
      {properties.externalOrigin
        ? <p className="inspector-help">Imported events are read-only in Pavucina.</p>
        : <button type="button" onClick={onEdit}>Edit event</button>}
    </aside>
  );
}
