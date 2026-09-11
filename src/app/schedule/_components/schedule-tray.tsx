import type { CSSProperties } from "react";

import { compactDateLabel } from "@/utils/date";
import type { DayScheduleTask, ScheduleTrayProps } from "@/types/schedule";

export default function ScheduleTray({
  days,
  overdue,
  selectedId,
  selectedDate,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDragCancel,
}: ScheduleTrayProps) {
  const taskCount = new Set(
    days.flatMap(({ tasks }) => tasks.map(({ task }) => task.id)),
  ).size;
  const rescheduleDate = days[0]?.date;

  function taskButton(
    { task, startDate, endDate }: DayScheduleTask,
    date: string,
    isOverdue = false,
  ) {
    const selected = selectedId === task.id && selectedDate === date;
    return (
      <button
        type="button"
        className={`schedule-tray-task${isOverdue ? " overdue" : ""}${
          selected ? " selected" : ""
        }`}
        aria-pressed={selected}
        key={`${isOverdue ? "overdue" : date}-${task.id}`}
        onClick={() => onSelect(task.id, date)}
        onPointerDown={(event) => onDragStart(event, task, date)}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragCancel}
      >
        <strong>{task.properties.name}</strong>
        <span>
          {isOverdue ? "Ended " : null}
          {!isOverdue && (
            <>
              <time dateTime={startDate}>{compactDateLabel(startDate)}</time>
              {" – "}
            </>
          )}
          <time dateTime={endDate}>{compactDateLabel(endDate)}</time>
        </span>
      </button>
    );
  }

  return (
    <section className="schedule-tray" aria-labelledby="schedule-tray-heading">
      <div className="schedule-tray-heading">
        <div>
          <p className="eyebrow">Unscheduled</p>
          <h3 id="schedule-tray-heading">
            {days.length === 1 ? "Plan this day" : "Plan these days"}
          </h3>
        </div>
        <span>{taskCount}</span>
      </div>
      {overdue.length > 0 && rescheduleDate && (
        <div className="schedule-tray-overdue">
          <div className="schedule-overdue-heading">
            <h4>Overdue</h4>
            <span>{overdue.length}</span>
          </div>
          <div className="schedule-overdue-tasks">
            {overdue.map((task) => taskButton(task, rescheduleDate, true))}
          </div>
        </div>
      )}
      <div
        className="schedule-tray-days"
        style={{ "--schedule-days": days.length } as CSSProperties}
      >
        {days.map(({ date, tasks }) => (
          <div className="schedule-tray-day" key={date}>
            <h4><time dateTime={date}>{compactDateLabel(date)}</time></h4>
            {tasks.length ? tasks.map((task) => taskButton(task, date)) : (
              <p className="schedule-tray-empty">No unscheduled tasks.</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
