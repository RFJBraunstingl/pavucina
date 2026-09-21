import assert from "node:assert/strict";
import test from "node:test";

import { isUuid } from "@/utils/shared/id.ts";

test("only internal UUIDs are accepted as session user IDs", () => {
  assert.equal(isUuid("00000000-0000-4000-8000-000000000001"), true);
  assert.equal(isUuid("github:123"), false);
  assert.equal(isUuid("google:123"), false);
});
