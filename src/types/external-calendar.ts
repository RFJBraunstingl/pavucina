import type { OAuthCredentials } from "./oauth";

export type CalendarSource = "google" | "outlook";
export type CalendarCredentials = OAuthCredentials;

export type CalendarSelection = {
  id: string;
  name: string;
  color: string;
  visible: boolean;
};

export type CalendarConnectionDocument = {
  _id: string;
  userId: string;
  source: CalendarSource;
  providerAccountId: string;
  address: string;
  credentials: string;
  calendars: CalendarSelection[];
  eventSyncStates?: CalendarEventSyncState[];
  createdAt: Date;
  updatedAt: Date;
};

export type CalendarOption = CalendarSelection & {
  selected: boolean;
};

export type ProviderCalendar = {
  id: string;
  name: string;
  color: string;
};

export type CalendarEventSyncState = {
  calendarId: string;
  cursor: string;
  rangeStart: string;
  rangeEnd: string;
  refreshAfter: string;
  timeZone: string;
  syncedAt: Date;
};

export type CalendarConnectionSummary = {
  id: string;
  source: CalendarSource;
  address: string;
  status: "connected" | "error";
  error?: string;
  calendars: CalendarOption[];
};

type ExternalCalendarEventBase = {
  id: string;
  connectionId: string;
  calendarId: string;
  calendarName: string;
  title: string;
  color: string;
  start: string;
  end: string;
  url?: string;
  description?: string;
  location?: string;
  providerUpdatedAt?: string;
};

export type ExternalCalendarEvent = ExternalCalendarEventBase & (
  | { allDay: true }
  | { allDay: false }
);

export type CalendarsResponse = {
  available: Record<CalendarSource, boolean>;
  connections: CalendarConnectionSummary[];
  events: ExternalCalendarEvent[];
};

export type CalendarEventChange =
  | { action: "upsert"; event: ExternalCalendarEvent }
  | { action: "delete"; eventId: string };

export type CalendarProviderSync = {
  changes: CalendarEventChange[];
  cursor: string;
  authoritative: boolean;
};

export type CalendarSyncBatch = {
  connectionId: string;
  source: CalendarSource;
  calendar: ProviderCalendar;
  changes: CalendarEventChange[];
  authoritative: boolean;
  state: CalendarEventSyncState;
};

export type CalendarImportError = {
  connectionId: string;
  calendarId?: string;
  message: string;
};
