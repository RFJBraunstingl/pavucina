import { useEffect, useRef, useState, type FormEvent } from "react";

import EventDateTimeFields from "./event-date-time-fields";
import ConfirmationDialog from "@/app/_components/common/confirmation-dialog";
import { EVENT_TEXT_LIMITS } from "@/utils/calendar/events/event";
import type { EventDialogProps } from "@/types/calendar/events/event";

export default function EventDialog({
  draft,
  onSave,
  onDelete,
  onClose,
}: EventDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const values = draft.values;
  const [allDay, setAllDay] = useState(Boolean(values.allDay));

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const field = (name: string) => String(data.get(name) ?? "");
    try {
      onSave({
        name: field("name"),
        location: field("location"),
        description: field("description"),
        startDate: field("startDate"),
        startTime: field("startTime"),
        endDate: field("endDate"),
        endTime: field("endTime"),
        allDay: data.has("allDay"),
        timeZone: values.timeZone,
      });
    } catch (value) {
      setError(
        value instanceof Error ? value.message : "Could not save the event.",
      );
    }
  }

  return (
    <>
      <dialog
        ref={dialog}
        className="app-dialog event-dialog"
        aria-labelledby="event-dialog-heading"
        onClose={onClose}
      >
        <form onSubmit={save}>
          <h2 id="event-dialog-heading">
            {draft.creating ? "New event" : "Edit event"}
          </h2>
          <label>
            Title
            <input
              name="name"
              required
              autoFocus
              maxLength={EVENT_TEXT_LIMITS.name}
              defaultValue={values.name}
            />
          </label>
          <EventDateTimeFields
            values={values}
            allDay={allDay}
            onAllDayChange={setAllDay}
          />
          <p>Time zone: {values.timeZone}</p>
          <label>
            Location
            <input
              name="location"
              maxLength={EVENT_TEXT_LIMITS.location}
              defaultValue={values.location}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={3}
              maxLength={EVENT_TEXT_LIMITS.description}
              defaultValue={values.description}
            />
          </label>
          {error && <p className="event-error" role="alert">{error}</p>}
          <div className="dialog-actions">
            {!draft.creating && (
              <button
                type="button"
                className="dialog-danger"
                onClick={() => setDeleting(true)}
              >
                Delete
              </button>
            )}
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Save</button>
          </div>
        </form>
      </dialog>
      <ConfirmationDialog
        open={deleting}
        title="Delete event?"
        message={<>Delete <strong>{values.name}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        onConfirm={onDelete}
        onClose={() => setDeleting(false)}
      />
    </>
  );
}
