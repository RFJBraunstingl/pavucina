import type { CalendarSelection } from "./events/external-calendar";
import type { FieldChange } from "@/types/graph/graph-sync";
export type CalendarSelectionChange = { id: string } & (
  | { kind: "create"; value: CalendarSelection }
  | { kind: "delete"; before: CalendarSelection }
  | { kind: "update"; fields: Record<string, FieldChange> }
);
