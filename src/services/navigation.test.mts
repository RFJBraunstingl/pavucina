import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_USER_PREFERENCES } from "./preferences-service.ts";
import {
  appPageFromPathname,
  resolvedStartPage,
  withLastPage,
} from "../utils/navigation.ts";

test("startup pages resolve independently for desktop and mobile", () => {
  assert.equal(resolvedStartPage(DEFAULT_USER_PREFERENCES, false), "timeline");
  assert.equal(resolvedStartPage(DEFAULT_USER_PREFERENCES, true), "timeline");

  const preferences = {
    ...DEFAULT_USER_PREFERENCES,
    desktopStartPage: "calendar" as const,
    mobileLastPage: "inbox" as const,
  };
  assert.equal(resolvedStartPage(preferences, false), "calendar");
  assert.equal(resolvedStartPage(preferences, true), "inbox");
});

test("only workspace routes are remembered", () => {
  assert.equal(appPageFromPathname("/timeline"), "timeline");
  assert.equal(appPageFromPathname("/schedule"), null);
  assert.equal(appPageFromPathname("/preferences"), null);
  assert.equal(appPageFromPathname("/"), null);

  const preferences = withLastPage(DEFAULT_USER_PREFERENCES, "todo", true);
  assert.equal(preferences.mobileLastPage, "todo");
  assert.equal(withLastPage(preferences, "todo", true), preferences);
});
