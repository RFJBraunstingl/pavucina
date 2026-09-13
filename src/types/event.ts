import type { CalendarSource } from "./external-calendar";

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
  externalOrigin: CalendarEventOrigin;
};

export type EventNode = {
  id: string;
  type: "event";
  properties: EventProperties;
};
