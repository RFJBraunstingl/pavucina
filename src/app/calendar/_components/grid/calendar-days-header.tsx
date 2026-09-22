import { dayLabel, dayOfMonth } from "@/utils/shared/temporal/date";

export default function CalendarDaysHeader({
  days,
  today,
}: {
  days: string[];
  today: string;
}) {
  return (
    <div className="calendar-days-header">
      <div className="calendar-corner" />
      {days.map((day) => (
        <div className={day === today ? "today" : ""} key={day}>
          <span>{dayLabel(day)}</span>
          <strong>{dayOfMonth(day)}</strong>
        </div>
      ))}
    </div>
  );
}
