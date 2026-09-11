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
