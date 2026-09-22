import "server-only";

import {
  openCalendarCredentials,
  sealCalendarCredentials,
} from "./calendar-oauth";
import { updateCalendarCredentials } from "./calendar-repository";
import {
  createOAuthRequest,
} from "@/services/http/oauth/oauth-client";
import { refreshOAuthCredentials } from "@/services/http/oauth/oauth-token-refresh";
import type {
  CalendarConnectionDocument,
  CalendarCredentials,
  CalendarSource,
} from "@/types/calendar/events/external-calendar";

const MICROSOFT_SCOPES =
  "openid profile email offline_access User.Read Calendars.Read.Shared";

function sourceConfig(source: CalendarSource) {
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
        scope: MICROSOFT_SCOPES,
      };
}

export function calendarSourceAvailability() {
  const google = sourceConfig("google");
  const outlook = sourceConfig("outlook");
  return {
    google: Boolean(google.clientId && google.clientSecret),
    outlook: Boolean(outlook.clientId && outlook.clientSecret),
  };
}

async function refreshedCredentials(
  connection: CalendarConnectionDocument,
  credentials: CalendarCredentials,
) {
  const next = await refreshOAuthCredentials(
    credentials,
    sourceConfig(connection.source),
    "Reconnect this calendar account to continue",
  );
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
