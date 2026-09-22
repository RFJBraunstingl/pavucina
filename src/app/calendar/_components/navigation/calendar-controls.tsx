import { useEffect, useState, type CSSProperties } from "react";

import CalendarManager from "../calendar-manager";
import type { useExternalCalendars } from "@/app/_components/sync/calendar/use-external-calendars";
import type { CalendarSelection } from "@/types/calendar/events/external-calendar";

type CalendarsState = ReturnType<typeof useExternalCalendars>;

function selectedCalendars(connection: NonNullable<CalendarsState["data"]>["connections"][number]) {
  return connection.calendars
    .filter(({ selected }) => selected)
    .map(({ id, name, color, visible }): CalendarSelection => ({
      id, name, color, visible,
    }));
}

export default function CalendarControls({
  calendars,
  onRefresh,
  importBusy = false,
}: {
  calendars: CalendarsState;
  onRefresh?: () => Promise<void>;
  importBusy?: boolean;
}) {
  const [managerOpen, setManagerOpen] = useState(() =>
    typeof window !== "undefined" &&
    new URL(window.location.href).searchParams.get("calendar") === "return");

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("calendar") !== "return") return;
    url.searchParams.delete("calendar");
    window.history.replaceState({}, "", url);
  }, []);

  return (
    <div className="external-calendar-controls">
      {calendars.conflictDialog}
      <div className="calendar-toggles">
        {calendars.data?.connections.flatMap((connection) =>
          connection.calendars.filter(({ selected }) => selected).map((calendar) => (
            <label
              key={`${connection.id}:${calendar.id}`}
              title={`${calendar.name} · ${connection.address}`}
              style={{ "--external-calendar-color": calendar.color } as CSSProperties}
            >
              <input
                type="checkbox"
                checked={calendar.visible}
                disabled={Boolean(calendars.busy)}
                aria-label={`Show ${calendar.name} from ${connection.address}`}
                onChange={() => void calendars.save(
                  connection.id,
                  selectedCalendars(connection).map((selection) =>
                    selection.id === calendar.id
                      ? { ...selection, visible: !selection.visible }
                      : selection),
                )}
              />
              <span aria-hidden="true" />
              {calendar.name}
            </label>
          )),
        )}
      </div>
      <button type="button" onClick={() => setManagerOpen(true)}>
        {calendars.data?.connections.length ? "Manage calendars" : "Add calendar"}
      </button>
      <button
        type="button"
        disabled={Boolean(calendars.busy) || importBusy}
        onClick={() =>
          void (onRefresh?.() ?? calendars.refresh()).catch(() => undefined)}
      >
        Refresh
      </button>
      <CalendarManager
        open={managerOpen}
        data={calendars.data}
        busy={calendars.busy}
        error={calendars.error}
        onClose={() => setManagerOpen(false)}
        onConnect={(source) => void calendars.connect(source)}
        onSave={(id, selected) => void calendars.save(id, selected)}
        onDisconnect={(id) => void calendars.disconnect(id)}
      />
    </div>
  );
}
