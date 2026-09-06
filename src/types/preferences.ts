export type ScheduleMode = "leaf" | "all";

export type UserPreferences = {
  collapsedTaskIds: string[];
  hideDone: boolean;
  showFullTaskPath?: boolean;
  taskColumnWidth?: number;
  scheduleMode?: ScheduleMode;
};

export type UserPreferencesDocument = {
  userId: string;
  preferences: UserPreferences;
};
