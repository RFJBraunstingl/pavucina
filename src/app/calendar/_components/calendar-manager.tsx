import { useEffect, useRef, useState } from "react";

import CalendarConnectionSection from "./calendar-connection-section";
import ConfirmationDialog from "@/app/_components/common/confirmation-dialog";
import { CALENDAR_SOURCES, calendarSourceLabel } from "@/utils/calendar/external-calendar";
import type {
  CalendarConnectionSummary,
  CalendarManagerProps,
} from "@/types/calendar/external-calendar";

export default function CalendarManager({
  open,
  data,
  busy,
  error,
  onClose,
  onConnect,
  onSave,
  onDisconnect,
}: CalendarManagerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [disconnecting, setDisconnecting] =
    useState<CalendarConnectionSummary | null>(null);
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal();
    if (!open && dialog.current?.open) dialog.current.close();
  }, [open]);

  return (
    <>
      <dialog
        ref={dialog}
        className="app-dialog calendar-manager"
        aria-labelledby="calendar-manager-heading"
        onClose={onClose}
      >
        <form method="dialog">
          <header>
            <div>
              <p className="eyebrow">Calendar overlay</p>
              <h2 id="calendar-manager-heading">Connected calendars</h2>
            </div>
            <button type="submit">Close</button>
          </header>
          <div className="calendar-connect-actions">
            {CALENDAR_SOURCES.map((source) => (
              <button
                type="button"
                key={source}
                disabled={Boolean(busy) || data?.available[source] === false}
                onClick={() => onConnect(source)}
              >
                Add {calendarSourceLabel(source)}
              </button>
            ))}
          </div>
          {!data && !error && <p>Loading calendars…</p>}
          {data?.connections.map((connection) => (
            <CalendarConnectionSection
              connection={connection}
              busy={Boolean(busy)}
              onReconnect={() => onConnect(connection.source)}
              onSave={(calendars) => onSave(connection.id, calendars)}
              onDisconnect={() => setDisconnecting(connection)}
              key={connection.id}
            />
          ))}
          {error && (
            <p className="calendar-manager-error" role="alert">{error}</p>
          )}
        </form>
      </dialog>
      <ConfirmationDialog
        open={Boolean(disconnecting)}
        title="Disconnect calendar?"
        message={
          <>
            Pavucina will delete its stored connection to {disconnecting?.address}.
            {" "}Imported events from this account will also be deleted. Your
            provider permission will not be revoked.
          </>
        }
        confirmLabel="Disconnect"
        onClose={() => setDisconnecting(null)}
        onConfirm={() => {
          if (!disconnecting) return;
          onDisconnect(disconnecting.id);
          setDisconnecting(null);
        }}
      />
    </>
  );
}
