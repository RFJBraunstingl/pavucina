"use client";

import { useSession } from "next-auth/react";

import { useCalendarImport } from "@/providers/calendar-import-provider";
import LoadingIndicator from "@/app/_components/common/loading-indicator";

export default function CalendarImportSettings() {
  const { status } = useSession();
  const calendarImport = useCalendarImport();
  return (
    <section className="preferences-card" aria-labelledby="calendar-import-heading">
      <header>
        <p className="eyebrow">Connected data</p>
        <h2 id="calendar-import-heading">
          Calendar event import
          <LoadingIndicator active={calendarImport.busy} label="Synchronizing calendar events…" />
        </h2>
      </header>
      <label className="calendar-import-toggle">
        <input
          type="checkbox"
          checked={calendarImport.enabled}
          disabled={!calendarImport.available || calendarImport.busy}
          onChange={(event) =>
            void calendarImport.setEnabled(event.target.checked).catch(() => undefined)}
        />
        <span>
          <strong>Store connected calendar events in the knowledge graph</strong>
          Imports every calendar available through connected Google and Outlook
          accounts, including calendars hidden from the Calendar view.
        </span>
      </label>
      <p className="calendar-import-note">
        Events are read-only and synchronized when Pavucina opens, hourly while
        active, and when Calendar is refreshed. The current device time zone is
        used. Disabling import deletes imported event data and its history.
      </p>
      <p className="calendar-import-note calendar-import-status">
        {calendarImport.lastSyncedAt
          ? `Last synchronized ${new Date(calendarImport.lastSyncedAt).toLocaleString()}.`
          : status === "unauthenticated"
            ? "Sign in to enable server-side import."
            : !calendarImport.available && status === "authenticated"
              ? "Load or restore your graph to manage calendar event import."
              : "\u00a0"}
      </p>
      {calendarImport.error && (
        <p className="calendar-import-error" role="alert">{calendarImport.error}</p>
      )}
    </section>
  );
}
