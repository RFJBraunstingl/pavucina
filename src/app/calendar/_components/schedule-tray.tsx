import type { CSSProperties } from "react";

import { compactDateLabel } from "@/utils/date";
import type { DayScheduleTask, ScheduleTrayProps } from "@/types/schedule";

export default function ScheduleTray(props: ScheduleTrayProps) {
  const taskCount = new Set(
    props.days.flatMap(({ tasks }) => tasks.map(({ task }) => task.id)),
  ).size;
  const rescheduleDate = props.days[0]?.date;

  function taskButton(
    { task, startDate, endDate }: DayScheduleTask,
    date: string,
    overdue = false,
  ) {
    const selected = props.selectedId === task.id && props.selectedDate === date;
    return (
      <button
        type="button"
        className={`schedule-tray-task${overdue ? " overdue" : ""}${
          selected ? " selected" : ""
        }`}
        aria-pressed={selected}
        key={`${overdue ? "overdue" : date}-${task.id}`}
        onClick={() => props.onSelect(task.id, date)}
        onPointerDown={(event) => props.onDragStart(event, task, date)}
        onPointerMove={props.onDragMove}
        onPointerUp={props.onDragEnd}
        onPointerCancel={props.onDragCancel}
      >
        <strong>{task.properties.name}</strong>
        <span>
          {overdue ? "Ended " : null}
          {!overdue && (
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
    <section
      className={`schedule-tray${props.locked ? " interactions-locked" : ""}`}
      aria-labelledby="schedule-tray-heading"
    >
      <div className="schedule-tray-heading">
        <div>
          <p className="eyebrow">Unscheduled</p>
          <h3 id="schedule-tray-heading">
            {props.days.length === 1 ? "Plan this day" : "Plan this week"}
          </h3>
        </div>
        <span>{taskCount}</span>
      </div>
      {props.overdue.length > 0 && rescheduleDate && (
        <div className="schedule-tray-overdue">
          <div className="schedule-overdue-heading">
            <h4>Overdue</h4>
            <span>{props.overdue.length}</span>
          </div>
          <div className="schedule-overdue-tasks">
            {props.overdue.map((task) => taskButton(task, rescheduleDate, true))}
          </div>
        </div>
      )}
      <div
        className="schedule-tray-days"
        style={{ "--schedule-days": props.days.length } as CSSProperties}
      >
        {props.days.map(({ date, tasks }) => (
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
