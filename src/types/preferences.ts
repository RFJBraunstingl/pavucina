export type UserPreferences = {
  collapsedTaskIds: string[];
  hideDone: boolean;
  taskColumnWidth?: number;
};

export type UserPreferencesDocument = {
  userId: string;
  preferences: UserPreferences;
};
