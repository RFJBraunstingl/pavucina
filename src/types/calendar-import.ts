import type { CalendarImportError } from "./external-calendar";
import type { GraphRevision } from "./graph-sync";

export type CalendarImportResponse = {
  revision: GraphRevision;
  errors: CalendarImportError[];
  syncedAt: string;
};
