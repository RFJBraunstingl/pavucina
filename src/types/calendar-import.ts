import type { CalendarImportError } from "./external-calendar";
import type { Graph } from "./graph";

export type CalendarImportResponse = {
  graph: Graph;
  errors: CalendarImportError[];
  syncedAt: string;
};
