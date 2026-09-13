import "server-only";

import {
  openCalendarCredentials,
  sealCalendarCredentials,
} from "./calendar-oauth";
import { updateCalendarCredentials } from "./calendar-repository";
import { createOAuthRequest } from "./oauth-client";
import {
  listGoogleCalendars,
  loadGoogleCalendarEvents,
} from "./google-calendar-provider";
import {
  listOutlookCalendars,
  loadOutlookCalendarEvents,
} from "./outlook-calendar-provider";
import type {
  CalendarConnectionDocument,
  CalendarCredentials,
} from "@/types/external-calendar";

const MICROSOFT_SCOPES =
  "openid profile email offline_access User.Read Calendars.Read.Shared";

function sourceConfig(source: "google" | "outlook") {
  return source === "google"
    ? {
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
        tokenUrl: "https://oauth2.googleapis.com/token",
      }
    : {
        clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      };
}

export function calendarSourceAvailability() {
  return {
    google: Boolean(sourceConfig("google").clientId && sourceConfig("google").clientSecret),
    outlook: Boolean(sourceConfig("outlook").clientId && sourceConfig("outlook").clientSecret),
  };
}

async function refreshedCredentials(
  connection: CalendarConnectionDocument,
  credentials: CalendarCredentials,
) {
  const config = sourceConfig(connection.source);
  if (!config.clientId || !config.clientSecret || !credentials.refreshToken) {
    throw new Error("Reconnect this calendar account to continue");
  }
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: credentials.refreshToken,
  });
  if (connection.source === "outlook") body.set("scope", MICROSOFT_SCOPES);
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const value: unknown = await response.json().catch(() => null);
  const token = value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  if (!response.ok || typeof token.access_token !== "string") {
    throw new Error("Reconnect this calendar account to continue");
  }
  const next: CalendarCredentials = {
    accessToken: token.access_token,
    refreshToken: typeof token.refresh_token === "string"
      ? token.refresh_token
      : credentials.refreshToken,
    expiresAt: Date.now() +
      (typeof token.expires_in === "number" ? token.expires_in : 3600) * 1_000,
  };
  await updateCalendarCredentials(connection, sealCalendarCredentials(next));
  return next;
}

export function createCalendarRequest(
  connection: CalendarConnectionDocument,
) {
  return createOAuthRequest(
    openCalendarCredentials(connection.credentials),
    (credentials) => refreshedCredentials(connection, credentials),
    "Could not access calendar",
  );
}

export function listProviderCalendars(
  connection: CalendarConnectionDocument,
  request: ReturnType<typeof createCalendarRequest>,
) {
  return connection.source === "google"
    ? listGoogleCalendars(request)
    : listOutlookCalendars(request);
}

export async function loadCalendarProvider(
  connection: CalendarConnectionDocument,
  start: string,
  end: string,
  includeEvents = true,
) {
  const request = createCalendarRequest(connection);
  const calendars = await listProviderCalendars(connection, request);
  const names = new Map(calendars.map(({ id, name }) => [id, name]));
  const selected = connection.calendars
    .filter(({ id, visible }) => visible && names.has(id))
    .map((calendar) => ({ ...calendar, name: names.get(calendar.id)! }));
  const groups = includeEvents
    ? await Promise.all(selected.map((calendar) =>
        connection.source === "google"
          ? loadGoogleCalendarEvents(connection, calendar, request, start, end)
          : loadOutlookCalendarEvents(connection, calendar, request, start, end)))
    : [];
  return { calendars, events: groups.flat() };
}
