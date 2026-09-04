import assert from "node:assert/strict";
import test from "node:test";

import {
  createUserId,
  graphCollectionPrefix,
  preferenceStorageUserId,
} from "./user-identity.ts";

test("OAuth identities are isolated without moving existing GitHub data", () => {
  assert.equal(createUserId("google", "123"), "google:123");
  assert.equal(graphCollectionPrefix("github:123"), "github_123");
  assert.equal(graphCollectionPrefix("google:123"), "google_123");
  assert.equal(graphCollectionPrefix("a0b1-c2d3"), "github_a0b1-c2d3");
  assert.equal(preferenceStorageUserId("github:123"), "123");
  assert.equal(preferenceStorageUserId("google:123"), "google:123");
  assert.throws(() => createUserId("unknown", "123"));
  assert.throws(() => graphCollectionPrefix("google:invalid/id"));
});
