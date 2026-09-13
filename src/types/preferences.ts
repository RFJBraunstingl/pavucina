import type { AppPage, StartPage } from "./navigation";

export type ScheduleMode = "leaf" | "all";

export type UserPreferences = {
  collapsedTaskIds: string[];
  hideDone: boolean;
  showFullTaskPath?: boolean;
  taskColumnWidth?: number;
  scheduleMode?: ScheduleMode;
  desktopStartPage?: StartPage;
  mobileStartPage?: StartPage;
  desktopLastPage?: AppPage;
  mobileLastPage?: AppPage;
  calendarEventImportEnabled?: boolean;
};

export type UserSettingsDocument = {
  userId: string;
  settings: UserPreferences;
};
