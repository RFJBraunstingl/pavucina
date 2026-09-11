import { useEffect, useRef } from "react";

import { CALENDAR_SOURCES, calendarSourceLabel } from "@/utils/external-calendar";
import type {
  CalendarConnectionSummary,
  CalendarSelection,
  CalendarSource,
  CalendarsResponse,
} from "@/types/external-calendar";

function selections(connection: CalendarConnectionSummary) {
  return connection.calendars
    .filter(({ selected }) => selected)
    .map(({ id, name, color, visible }): CalendarSelection => ({
      id, name, color, visible,
    }));
}

export default function CalendarManager({
  open,
  data,
  busy,
  error,
  onClose,
  onConnect,
  onSave,
  onDisconnect,
}: {
  open: boolean;
  data: CalendarsResponse | null;
  busy: string | null;
  error: string | null;
  onClose: () => void;
  onConnect: (source: CalendarSource) => void;
  onSave: (connectionId: string, calendars: CalendarSelection[]) => void;
  onDisconnect: (connectionId: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  function select(connection: CalendarConnectionSummary, calendarId: string) {
    const current = selections(connection);
    const option = connection.calendars.find(({ id }) => id === calendarId)!;
    onSave(
      connection.id,
      option.selected
        ? current.filter(({ id }) => id !== calendarId)
        : [...current, {
            id: option.id,
            name: option.name,
            color: option.color,
            visible: true,
          }],
    );
  }

  function setColor(
    connection: CalendarConnectionSummary,
    calendarId: string,
    color: string,
  ) {
    onSave(
      connection.id,
      selections(connection).map((calendar) =>
        calendar.id === calendarId ? { ...calendar, color } : calendar),
    );
  }

  return (
    <dialog
      ref={dialog}
      className="calendar-manager"
      aria-labelledby="calendar-manager-heading"
      onClose={onClose}
    >
      <form method="dialog">
        <header>
          <div>
            <p className="eyebrow">Calendar overlay</p>
            <h2 id="calendar-manager-heading">Connected calendars</h2>
          </div>
          <button type="submit">Close</button>
        </header>
        <div className="calendar-connect-actions">
          {CALENDAR_SOURCES.map((source) => (
            <button
              type="button"
              key={source}
              disabled={Boolean(busy) || data?.available[source] === false}
              onClick={() => onConnect(source)}
            >
              Add {calendarSourceLabel(source)}
            </button>
          ))}
        </div>
        {!data && !error && <p>Loading calendars…</p>}
        {data?.connections.map((connection) => (
          <section key={connection.id}>
            <header>
              <div>
                <strong>{connection.address}</strong>
                <small>{calendarSourceLabel(connection.source)}</small>
              </div>
              <div>
                {connection.status === "error" && (
                  <button type="button" onClick={() => onConnect(connection.source)}>
                    Reconnect
                  </button>
                )}
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => {
                    if (window.confirm(`Disconnect ${connection.address}?`)) {
                      onDisconnect(connection.id);
                    }
                  }}
                >
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
                    disabled={Boolean(busy)}
                    onChange={() => select(connection, calendar.id)}
                  />
                  <span>{calendar.name}</span>
                  <input
                    type="color"
                    aria-label={`Color for ${calendar.name}`}
                    value={calendar.color}
                    disabled={!calendar.selected || Boolean(busy)}
                    onChange={(event) => setColor(connection, calendar.id, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </section>
        ))}
        {error && <p className="calendar-manager-error" role="alert">{error}</p>}
      </form>
    </dialog>
  );
}
