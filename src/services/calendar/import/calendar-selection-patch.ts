import { changedFields, equalValue } from "@/utils/shared/field-changes.ts";
import { parseCalendarSelections } from "@/utils/calendar/external-calendar.ts";
import { GraphConflictError } from "@/services/graph/sync/graph-patch-service.ts";
import type { CalendarSelection } from "@/types/calendar/external-calendar.ts";
import type { CalendarSelectionChange } from "@/types/calendar/calendar-selection-patch.ts";

export function diffCalendarSelections(before: CalendarSelection[], after: CalendarSelection[]): CalendarSelectionChange[] {
  const changes: CalendarSelectionChange[] = [];
  for (const calendar of before) if (!after.some(({ id }) => id === calendar.id)) changes.push({ id: calendar.id, kind: "delete", before: calendar });
  for (const calendar of after) {
    const previous = before.find(({ id }) => id === calendar.id);
    if (!previous) changes.push({ id: calendar.id, kind: "create", value: calendar });
    else {
      const fields = changedFields(previous, calendar);
      if (Object.keys(fields).length) changes.push({ id: calendar.id, kind: "update", fields });
    }
  }
  return changes;
}
export function applyCalendarSelectionChanges(current: CalendarSelection[], changes: CalendarSelectionChange[], force = false) {
  let calendars = [...current];
  for (const change of changes) {
    const previous = calendars.find(({ id }) => id === change.id);
    const conflict = (field: string, mine: unknown, saved: unknown): never => { throw new GraphConflictError([{ id: change.id, field, mine, saved }]); };
    if (change.kind === "delete") {
      if (previous && !force && !equalValue(previous, change.before)) conflict("calendar selection", undefined, previous);
      calendars = calendars.filter(({ id }) => id !== change.id);
    } else if (change.kind === "create") {
      if (previous && !equalValue(previous, change.value)) conflict("calendar selection", change.value, previous);
      if (!previous) calendars.push(change.value);
    } else {
      if (!previous) conflict("calendar deselected", change.fields, undefined);
      const next = { ...previous } as CalendarSelection & Record<string, unknown>;
      for (const [key, field] of Object.entries(change.fields)) {
        if (!force && !equalValue(next[key], field.before) && !equalValue(next[key], field.after)) conflict(key, field.after, next[key]);
        if (!["name", "color", "visible"].includes(key)) throw new Error("Invalid calendar field");
        next[key] = field.after;
      }
      calendars = calendars.map((calendar) => calendar.id === change.id ? next : calendar);
    }
  }
  if (!parseCalendarSelections(calendars)) throw new Error("Invalid calendar selections");
  return calendars;
}
export function isCalendarSelectionChanges(value: unknown): value is CalendarSelectionChange[] {
  return Array.isArray(value) && value.every((change) => change && typeof change === "object" && typeof change.id === "string" && change.id.length <= 1024 && (
    change.kind === "create" ? Boolean(parseCalendarSelections([change.value])) && change.value.id === change.id :
    change.kind === "delete" ? Boolean(parseCalendarSelections([change.before])) && change.before.id === change.id :
    change.kind === "update" && change.fields && typeof change.fields === "object" && Object.entries(change.fields).every(([key, field]) =>
      ["name", "color", "visible"].includes(key) && field && typeof field === "object" && Object.keys(field).every((key) => key === "before" || key === "after"))));
}
