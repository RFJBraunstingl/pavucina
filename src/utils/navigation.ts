import type { AppPage, StartPage } from "@/types/preferences/navigation.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";

export const MOBILE_VIEW_QUERY = "(max-width: 680px)";

export const APP_PAGES: ReadonlyArray<{ id: AppPage; label: string }> = [
  { id: "inbox", label: "Inbox" },
  { id: "timeline", label: "Timeline" },
  { id: "calendar", label: "Calendar" },
  { id: "todo", label: "ToDo" },
];

export function isAppPage(value: unknown): value is AppPage {
  return APP_PAGES.some(({ id }) => id === value);
}

export function isStartPage(value: unknown): value is StartPage {
  return value === "last" || isAppPage(value);
}

export function appPageFromPathname(pathname: string) {
  const page = pathname.slice(1);
  return pathname === `/${page}` && isAppPage(page) ? page : null;
}

export function appPagePath(page: AppPage) {
  return `/${page}` as const;
}

export function resolvedStartPage(
  preferences: UserPreferences,
  mobile: boolean,
): AppPage {
  const startPage = mobile
    ? preferences.mobileStartPage
    : preferences.desktopStartPage;
  if (startPage && startPage !== "last") return startPage;
  return (
    (mobile ? preferences.mobileLastPage : preferences.desktopLastPage) ??
    "timeline"
  );
}

export function withLastPage(
  preferences: UserPreferences,
  page: AppPage,
  mobile: boolean,
) {
  const key = mobile ? "mobileLastPage" : "desktopLastPage";
  return preferences[key] === page
    ? preferences
    : { ...preferences, [key]: page };
}
