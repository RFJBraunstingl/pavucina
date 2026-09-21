import type { CalendarSource } from "./external-calendar";
import type { Graph } from "@/types/graph/graph";

export type CalendarEventOrigin = {
  kind: "calendar";
  source: CalendarSource;
  connectionId: string;
  calendarId: string;
  eventId: string;
};

export type EventProperties = {
  name: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  allDay: boolean;
  timeZone: string;
  calendarName: string;
  calendarColor: string;
  sourceUrl?: string;
  providerUpdatedAt?: string;
  externalOrigin?: CalendarEventOrigin;
};

export type EventNode = {
  id: string;
  type: "event";
  properties: EventProperties;
};

export type ImportedEventNode = EventNode & {
  properties: EventProperties & { externalOrigin: CalendarEventOrigin };
};

export type EventTimeRange = {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
};

export type NativeEventInput = EventTimeRange & {
  name: string;
  description: string;
  location: string;
  timeZone: string;
};

export type EventDraft = {
  id: string;
  creating: boolean;
  values: NativeEventInput;
};

export type EventDialogProps = {
  draft: EventDraft;
  onSave: (values: NativeEventInput) => void;
  onDelete: () => void;
  onClose: () => void;
};

export type EventEditorState = { scope: string | undefined; draft: EventDraft };
export type EventInspectorProps = { graph: Graph; event: EventNode; onEdit: () => void };
