import { calendarSourceLabel } from "@/utils/calendar/events/external-calendar-source";
import type {
  CalendarConnectionSectionProps,
  CalendarSelection,
} from "@/types/calendar/events/external-calendar";

function selections({ calendars }: CalendarConnectionSectionProps["connection"]) {
  return calendars
    .filter(({ selected }) => selected)
    .map(({ id, name, color, visible }): CalendarSelection => ({
      id,
      name,
      color,
      visible,
    }));
}

export default function CalendarConnectionSection({
  connection,
  busy,
  onReconnect,
  onSave,
  onDisconnect,
}: CalendarConnectionSectionProps) {
  function select(calendarId: string) {
    const current = selections(connection);
    const option = connection.calendars.find(({ id }) => id === calendarId);
    if (!option) return;
    onSave(option.selected
      ? current.filter(({ id }) => id !== calendarId)
      : [...current, {
          id: option.id,
          name: option.name,
          color: option.color,
          visible: true,
        }]);
  }

  function setColor(calendarId: string, color: string) {
    onSave(selections(connection).map((calendar) =>
      calendar.id === calendarId ? { ...calendar, color } : calendar));
  }

  return (
    <section>
      <header>
        <div>
          <strong>{connection.address}</strong>
          <small>{calendarSourceLabel(connection.source)}</small>
        </div>
        <div>
          {connection.status === "error" && (
            <button type="button" onClick={onReconnect}>Reconnect</button>
          )}
          <button type="button" disabled={busy} onClick={onDisconnect}>
            Disconnect
          </button>
        </div>
      </header>
      {connection.error && <p role="alert">{connection.error}</p>}
      <div className="calendar-options">
        {connection.calendars.map((calendar) => (
          <label key={calendar.id}>
            <input
              type="checkbox"
              checked={calendar.selected}
              disabled={busy}
              onChange={() => select(calendar.id)}
            />
            <span>{calendar.name}</span>
            <input
              type="color"
              aria-label={`Color for ${calendar.name}`}
              value={calendar.color}
              disabled={!calendar.selected || busy}
              onChange={(event) => setColor(calendar.id, event.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
