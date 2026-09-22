import type { CalendarSelectionChange } from "@/types/calendar/calendar-selection-patch";
import type { CalendarsResponse } from "@/types/calendar/events/external-calendar";
import type { SyncConflict } from "@/types/graph/graph-sync";

export function selectedCalendars(
  data: CalendarsResponse | null,
  connectionId: string,
) {
  return data?.connections
    .find(({ id }) => id === connectionId)
    ?.calendars
    .filter(({ selected }) => selected)
    .map(({ id, name, color, visible }) => ({ id, name, color, visible })) ?? [];
}

export function removeConflictingChanges(
  changes: CalendarSelectionChange[],
  conflicts: SyncConflict[],
) {
  return changes.flatMap((change) => {
    const conflictsForCalendar = conflicts.filter(
      ({ id }) => id === change.id,
    );
    if (!conflictsForCalendar.length) return [change];
    if (change.kind !== "update" ||
      conflictsForCalendar.some(({ field }) => field === "calendar deselected")) {
      return [];
    }
    return [{
      ...change,
      fields: Object.fromEntries(
        Object.entries(change.fields).filter(([field]) =>
          !conflictsForCalendar.some((conflict) => conflict.field === field),
        ),
      ),
    }];
  });
}
