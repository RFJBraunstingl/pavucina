import assert from "node:assert/strict";
import test from "node:test";
import { debouncedDescription } from "@/utils/shared/debounced-description.ts";

test("description edits commit only the latest text after a typing pause", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const saved: string[] = [];
  const edit = debouncedDescription((value) => saved.push(value));
  edit.schedule("First");
  context.mock.timers.tick(400);
  edit.schedule("First and second");
  context.mock.timers.tick(499);
  assert.deepEqual(saved, []);
  assert.equal(edit.pending, true);
  context.mock.timers.tick(1);
  assert.deepEqual(saved, ["First and second"]);
  assert.equal(edit.pending, false);
});

test("leaving a description flushes once, while cancellation discards pending edits", (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const saved: string[] = [];
  const edit = debouncedDescription((value) => saved.push(value));
  edit.schedule("");
  edit.flush();
  edit.flush();
  context.mock.timers.tick(500);
  assert.deepEqual(saved, [""]);
  edit.schedule("Deleted task");
  edit.cancel();
  context.mock.timers.tick(500);
  assert.deepEqual(saved, [""]);
  assert.equal(edit.pending, false);
});
