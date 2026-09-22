import assert from "node:assert/strict";
import test from "node:test";

import { accountLinkOutcome } from "@/utils/account/account-link.ts";
import {
  authProviderLabel,
  isAuthProvider,
} from "@/utils/account/auth-provider.ts";

test("Microsoft is a supported authentication provider", () => {
  assert.equal(isAuthProvider("microsoft-entra-id"), true);
  assert.equal(authProviderLabel("microsoft-entra-id"), "Microsoft");
  assert.equal(isAuthProvider("outlook"), false);
});

test("linking detects whether another workspace needs confirmation", () => {
  assert.deepEqual(accountLinkOutcome("current", "current"), {
    state: "complete",
  });
  assert.deepEqual(accountLinkOutcome("current", "existing"), {
    state: "conflict",
    targetUserId: "existing",
  });
});
