import assert from "node:assert/strict";
import test from "node:test";

import { archiveMailboxMessage } from "./mailbox-provider.ts";
import { sealMailboxCredentials } from "./mailbox-crypto.ts";
import type { MailboxConnectionDocument } from "@/types/mailbox/mailbox.ts";

for (const { source, url, body, status } of [
  {
    source: "gmail" as const,
    url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/message%2Fid%2B%3D/modify",
    body: { removeLabelIds: ["INBOX"] },
    status: 200,
  },
  {
    source: "outlook" as const,
    url: "https://graph.microsoft.com/v1.0/me/messages/message%2Fid%2B%3D/move",
    body: { destinationId: "archive" },
    status: 201,
  },
]) {
  test(`${source} archives without changing read status and reports failures`, async (context) => {
    const previous = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "test-only-secret";
    const fetchMock = context.mock.method(globalThis, "fetch", async () =>
      new Response(null, { status }),
    );

    try {
      const connection: MailboxConnectionDocument = {
        _id: crypto.randomUUID(),
        userId: crypto.randomUUID(),
        source,
        providerAccountId: "account-id",
        address: `${source}@example.com`,
        credentials: sealMailboxCredentials({ accessToken: "test-token" }),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await archiveMailboxMessage(connection, "message/id+=");
      assert.equal(fetchMock.mock.calls.length, 1);
      const [input, init] = fetchMock.mock.calls[0].arguments;
      assert.equal(String(input), url);
      assert.equal(init?.method, "POST");
      assert.deepEqual(JSON.parse(String(init?.body)), body);

      fetchMock.mock.mockImplementation(async () =>
        new Response(null, { status: 403 }),
      );
      await assert.rejects(
        archiveMailboxMessage(connection, "message/id+="),
        { message: "Could not access mailbox (403)" },
      );
    } finally {
      if (previous === undefined) delete process.env.AUTH_SECRET;
      else process.env.AUTH_SECRET = previous;
    }
  });
}
