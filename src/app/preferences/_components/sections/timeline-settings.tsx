import { useRef } from "react";

import type { ScheduleMode } from "@/types/preferences/preferences";

type TimelineSettingsProps = {
  scheduleMode: ScheduleMode;
  disabled: boolean;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  onEnableLeafMode: () => void;
};

export default function TimelineSettings({
  scheduleMode,
  disabled,
  onScheduleModeChange,
  onEnableLeafMode,
}: TimelineSettingsProps) {
  const leafModeDialog = useRef<HTMLDialogElement>(null);

  function selectMode(mode: ScheduleMode) {
    if (mode === scheduleMode) return;
    if (mode === "leaf") leafModeDialog.current?.showModal();
    else onScheduleModeChange(mode);
  }

  return (
    <>
      <section
        className="preferences-card"
        aria-labelledby="timeline-preferences"
      >
        <header>
          <p className="eyebrow">Preferences</p>
          <h2 id="timeline-preferences">Timeline</h2>
        </header>
        <fieldset className="schedule-mode-options" disabled={disabled}>
          <legend>Scheduling mode</legend>
          <label>
            <input
              type="radio"
              name="schedule-mode"
              checked={scheduleMode === "leaf"}
              onChange={() => selectMode("leaf")}
            />
            <span>
              <strong>Leaf tasks only</strong>
              Parent dates are calculated from their scheduled child tasks.
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="schedule-mode"
              checked={scheduleMode === "all"}
              onChange={() => selectMode("all")}
            />
            <span>
              <strong>All tasks</strong>
              Every task keeps and displays its own schedule.
            </span>
          </label>
        </fieldset>
      </section>
      <dialog
        ref={leafModeDialog}
        className="app-dialog"
        aria-labelledby="leaf-mode-dialog-heading"
      >
        <form method="dialog">
          <h3 id="leaf-mode-dialog-heading">Enable leaf scheduling?</h3>
          <p>
            Planned dates and times stored on tasks with children will be
            permanently deleted. This cannot be undone.
          </p>
          <div className="dialog-actions">
            <button type="submit" autoFocus>Cancel</button>
            <button
              type="submit"
              className="dialog-danger"
              onClick={onEnableLeafMode}
            >
              Delete schedules and enable
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
