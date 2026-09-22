import { parseCalendarSelections } from "@/utils/calendar/events/external-calendar-source.ts";
import type { CalendarSelectionChange } from "@/types/calendar/calendar-selection-patch.ts";

export const EDITABLE_CALENDAR_FIELDS = new Set(["name", "color", "visible"]);

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSelection(value: unknown, id: string) {
  return object(value) && value.id === id &&
    Boolean(parseCalendarSelections([value]));
}

function isFieldChanges(value: unknown) {
  return object(value) && Object.entries(value).every(([key, field]) =>
    EDITABLE_CALENDAR_FIELDS.has(key) &&
    object(field) &&
    Object.keys(field).every((name) => name === "before" || name === "after"),
  );
}

function isCalendarSelectionChange(value: unknown) {
  if (!object(value) || typeof value.id !== "string" || value.id.length > 1_024) {
    return false;
  }
  if (value.kind === "create") return isSelection(value.value, value.id);
  if (value.kind === "delete") return isSelection(value.before, value.id);
  return value.kind === "update" && isFieldChanges(value.fields);
}

export function isCalendarSelectionChanges(
  value: unknown,
): value is CalendarSelectionChange[] {
  return Array.isArray(value) && value.every(isCalendarSelectionChange);
}
