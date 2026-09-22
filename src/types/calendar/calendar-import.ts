import type { CalendarImportError } from "./events/external-calendar";
import type { GraphRevision } from "@/types/graph/graph-sync";

export type CalendarImportResponse = {
  revision: GraphRevision;
  errors: CalendarImportError[];
  syncedAt: string;
};
