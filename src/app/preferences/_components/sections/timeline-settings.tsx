import { useState } from "react";

import ConfirmationDialog from "@/app/_components/common/confirmation-dialog";
import type { ScheduleMode } from "@/types/preferences/preferences";
import type { TimelineSettingsProps } from "@/types/preferences/preferences-components";

export default function TimelineSettings({
  scheduleMode,
  disabled,
  onScheduleModeChange,
  onEnableLeafMode,
}: TimelineSettingsProps) {
  const [confirmingLeafMode, setConfirmingLeafMode] = useState(false);

  function selectMode(mode: ScheduleMode) {
    if (mode === scheduleMode) return;
    if (mode === "leaf") setConfirmingLeafMode(true);
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
      <ConfirmationDialog
        open={confirmingLeafMode}
        title="Enable leaf scheduling?"
        message="Planned dates and times stored on tasks with children will be permanently deleted. This cannot be undone."
        confirmLabel="Delete schedules and enable"
        onConfirm={() => {
          setConfirmingLeafMode(false);
          onEnableLeafMode();
        }}
        onClose={() => setConfirmingLeafMode(false)}
      />
    </>
  );
}
