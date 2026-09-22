import assert from "node:assert/strict";
import test from "node:test";

import { refreshOAuthCredentials } from "./oauth-token-refresh.ts";

test("OAuth refresh keeps the existing refresh token and calculates expiry", async (context) => {
  context.mock.method(globalThis, "fetch", async () => Response.json({
    access_token: "new-access-token",
    expires_in: 60,
  }));
  const startedAt = Date.now();
  const credentials = await refreshOAuthCredentials(
    { accessToken: "old-access-token", refreshToken: "refresh-token" },
    {
      clientId: "client-id",
      clientSecret: "client-secret",
      tokenUrl: "https://example.com/token",
    },
    "Reconnect",
  );

  assert.equal(credentials.accessToken, "new-access-token");
  assert.equal(credentials.refreshToken, "refresh-token");
  assert.ok(credentials.expiresAt >= startedAt + 60_000);
});
