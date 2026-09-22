import { GraphConflictError } from "@/services/graph/sync/graph-conflict-error.ts";
import { EDITABLE_CALENDAR_FIELDS } from "./calendar-selection-validation.ts";
import { parseCalendarSelections } from "@/utils/calendar/events/external-calendar-source.ts";
import { changedFields, equalValue } from "@/utils/shared/field-changes.ts";
import type { CalendarSelectionChange } from "@/types/calendar/calendar-selection-patch.ts";
import type { CalendarSelection } from "@/types/calendar/events/external-calendar.ts";

function selectionConflict(
  id: string,
  field: string,
  mine: unknown,
  saved: unknown,
): never {
  throw new GraphConflictError([{ id, field, mine, saved }]);
}

export function diffCalendarSelections(
  before: CalendarSelection[],
  after: CalendarSelection[],
): CalendarSelectionChange[] {
  const beforeById = new Map(before.map((calendar) => [calendar.id, calendar]));
  const afterIds = new Set(after.map(({ id }) => id));
  const changes: CalendarSelectionChange[] = before
    .filter(({ id }) => !afterIds.has(id))
    .map((calendar) => ({
      id: calendar.id,
      kind: "delete",
      before: calendar,
    }));

  for (const calendar of after) {
    const previous = beforeById.get(calendar.id);
    if (!previous) {
      changes.push({ id: calendar.id, kind: "create", value: calendar });
      continue;
    }
    const fields = changedFields(previous, calendar);
    if (Object.keys(fields).length) {
      changes.push({ id: calendar.id, kind: "update", fields });
    }
  }
  return changes;
}

function applySelectionChange(
  calendars: CalendarSelection[],
  change: CalendarSelectionChange,
  force: boolean,
) {
  const previous = calendars.find(({ id }) => id === change.id);

  if (change.kind === "delete") {
    if (previous && !force && !equalValue(previous, change.before)) {
      selectionConflict(change.id, "calendar selection", undefined, previous);
    }
    return calendars.filter(({ id }) => id !== change.id);
  }

  if (change.kind === "create") {
    if (previous && !equalValue(previous, change.value)) {
      selectionConflict(change.id, "calendar selection", change.value, previous);
    }
    return previous ? calendars : [...calendars, change.value];
  }

  if (!previous) {
    selectionConflict(change.id, "calendar deselected", change.fields, undefined);
  }
  const updated = { ...previous } as CalendarSelection & Record<string, unknown>;
  for (const [key, field] of Object.entries(change.fields)) {
    if (!force &&
      !equalValue(updated[key], field.before) &&
      !equalValue(updated[key], field.after)) {
      selectionConflict(change.id, key, field.after, updated[key]);
    }
    if (!EDITABLE_CALENDAR_FIELDS.has(key)) {
      throw new Error("Invalid calendar field");
    }
    updated[key] = field.after;
  }
  return calendars.map((calendar) =>
    calendar.id === change.id ? updated : calendar,
  );
}

export function applyCalendarSelectionChanges(
  current: CalendarSelection[],
  changes: CalendarSelectionChange[],
  force = false,
) {
  const calendars = changes.reduce(
    (result, change) => applySelectionChange(result, change, force),
    current,
  );
  if (!parseCalendarSelections(calendars)) {
    throw new Error("Invalid calendar selections");
  }
  return calendars;
}
