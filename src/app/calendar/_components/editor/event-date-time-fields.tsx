import type { EventDateTimeFieldsProps } from "@/types/calendar/events/event";

export default function EventDateTimeFields({
  values,
  allDay,
  onAllDayChange,
}: EventDateTimeFieldsProps) {
  return (
    <>
      <label className="event-all-day">
        <input
          name="allDay"
          type="checkbox"
          checked={allDay}
          onChange={(event) => onAllDayChange(event.target.checked)}
        />
        All day
      </label>
      <div className="event-date-time">
        <label>
          Start date
          <input
            name="startDate"
            type="date"
            required
            defaultValue={values.startDate}
          />
        </label>
        <label>
          Start time
          <input
            name="startTime"
            type="time"
            required={!allDay}
            disabled={allDay}
            defaultValue={values.startTime}
          />
        </label>
        <label>
          End date
          <input
            name="endDate"
            type="date"
            required
            defaultValue={values.endDate}
          />
        </label>
        <label>
          End time
          <input
            name="endTime"
            type="time"
            required={!allDay}
            disabled={allDay}
            defaultValue={values.endTime}
          />
        </label>
      </div>
    </>
  );
}
