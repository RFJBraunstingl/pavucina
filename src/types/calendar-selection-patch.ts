import type { CalendarSelection } from "./external-calendar";
import type { FieldChange } from "./graph-sync";
export type CalendarSelectionChange = { id: string } & (
  | { kind: "create"; value: CalendarSelection }
  | { kind: "delete"; before: CalendarSelection }
  | { kind: "update"; fields: Record<string, FieldChange> }
);
