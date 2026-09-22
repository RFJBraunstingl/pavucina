import assert from "node:assert/strict";
import test from "node:test";

import { syncGoogleCalendar } from "./google/google-calendar-sync.ts";
import { syncOutlookCalendar } from "./outlook/outlook-calendar-sync.ts";
import { OAuthRequestError } from "@/services/http/oauth/oauth-client.ts";
import type {
  CalendarConnectionDocument,
  ProviderCalendar,
} from "@/types/calendar/events/external-calendar.ts";
import type { OAuthRequest } from "@/types/auth/oauth.ts";

const calendar: ProviderCalendar = { id: "work", name: "Work", color: "#4285f4" };
const connection: CalendarConnectionDocument = {
  _id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  source: "google",
  providerAccountId: "account",
  address: "person@example.com",
  credentials: "encrypted",
  calendars: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

test("Google event sync requests a bounded initial window and saves its token", async () => {
  let requested = "";
  const request: OAuthRequest = async (url) => {
    requested = url;
    return Response.json({
      items: [{
        id: "event",
        summary: "Planning",
        description: "Discuss release",
        location: "Room 3",
        updated: "2026-09-13T08:00:00Z",
        start: { dateTime: "2026-09-13T09:00:00Z" },
        end: { dateTime: "2026-09-13T10:00:00Z" },
      }, { id: "removed", status: "cancelled" }],
      nextSyncToken: "next-token",
    });
  };
  const result = await syncGoogleCalendar(
    connection, calendar, request, "2026-08-14", "2027-09-14", "Europe/Vienna",
  );
  const url = new URL(requested);
  assert.equal(url.searchParams.get("timeMin"), "2026-08-14T00:00:00Z");
  assert.equal(url.searchParams.get("syncToken"), null);
  assert.equal(result.cursor, "next-token");
  assert.equal(result.authoritative, true);
  assert.deepEqual(result.changes.map(({ action }) => action), ["upsert", "delete"]);
});

test("Outlook event sync consumes an existing delta link incrementally", async () => {
  const cursor = "https://graph.microsoft.com/v1.0/me/calendars/work/calendarView/delta?$deltatoken=old";
  let requested = "";
  const request: OAuthRequest = async (url) => {
    requested = url;
    return Response.json({
      value: [{ id: "removed", "@removed": { reason: "deleted" } }],
      "@odata.deltaLink": `${cursor}2`,
    });
  };
  const result = await syncOutlookCalendar(
    { ...connection, source: "outlook" },
    calendar,
    request,
    "2026-08-14",
    "2027-09-14",
    cursor,
  );
  assert.equal(requested, cursor);
  assert.equal(result.authoritative, false);
  assert.deepEqual(result.changes, [{ action: "delete", eventId: "removed" }]);
});

test("an expired Google token falls back to a new full synchronization", async () => {
  const requested: string[] = [];
  const request: OAuthRequest = async (url) => {
    requested.push(url);
    if (requested.length === 1) throw new OAuthRequestError("Expired", 410);
    return Response.json({ items: [], nextSyncToken: "replacement" });
  };
  const result = await syncGoogleCalendar(
    connection,
    calendar,
    request,
    "2026-08-14",
    "2027-09-14",
    "Europe/Vienna",
    "expired",
  );
  assert.equal(new URL(requested[0]).searchParams.get("syncToken"), "expired");
  assert.equal(new URL(requested[1]).searchParams.get("timeMin"), "2026-08-14T00:00:00Z");
  assert.equal(result.authoritative, true);
});
