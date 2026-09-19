import assert from "node:assert/strict";
import test from "node:test";

import { authorizeMaintenance } from "./maintenance-auth.ts";

test("maintenance authorization requires its configured bearer secret", () => {
  assert.equal(authorizeMaintenance(null, ""), "unconfigured");
  assert.equal(authorizeMaintenance(null, "secret"), "unauthorized");
  assert.equal(authorizeMaintenance("Bearer wrong", "secret"), "unauthorized");
  assert.equal(authorizeMaintenance("Bearer secret", "secret"), "authorized");
});
