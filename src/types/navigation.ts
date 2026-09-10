export type AppHeaderProps = {
  active:
    | "timeline"
    | "inbox"
    | "calendar"
    | "schedule"
    | "todo"
    | "preferences";
  title: string;
};
