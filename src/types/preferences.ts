export type UserPreferences = {
  collapsedTaskIds: string[];
  hideDone: boolean;
};

export type UserPreferencesDocument = {
  userId: string;
  preferences: UserPreferences;
};
