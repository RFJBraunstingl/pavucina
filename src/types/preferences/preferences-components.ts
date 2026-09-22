import type { StartPage } from "./navigation";
import type { ScheduleMode, UserPreferences } from "./preferences";

export type StartupPageSettingsProps = {
  preferences: UserPreferences;
  onChange: (changes: Partial<UserPreferences>) => void;
};

export type StartupPageSelectProps = {
  label: string;
  description: string;
  value: StartPage;
  onChange: (value: StartPage) => void;
};

export type TimelineSettingsProps = {
  scheduleMode: ScheduleMode;
  disabled: boolean;
  onScheduleModeChange: (mode: ScheduleMode) => void;
  onEnableLeafMode: () => void;
};
