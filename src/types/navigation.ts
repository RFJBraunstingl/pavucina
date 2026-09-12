export type AppPage =
  | "inbox"
  | "timeline"
  | "calendar"
  | "schedule"
  | "todo";

export type StartPage = AppPage | "last";

export type AppHeaderProps = {
  active: AppPage | "preferences";
  title: string;
};
