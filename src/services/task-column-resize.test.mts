import assert from "node:assert/strict";
import test from "node:test";

import { resizedTaskColumnWidth } from "../app/_components/use-task-column-resize.ts";

test("task column resizing stays within desktop limits", () => {
  assert.deepEqual(
    [
      resizedTaskColumnWidth(286, 40),
      resizedTaskColumnWidth(200, -1),
      resizedTaskColumnWidth(640, 1),
    ],
    [326, 200, 640],
  );
});
