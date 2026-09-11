import assert from "node:assert/strict";
import test from "node:test";

import {
  openMailboxValue,
  sealMailboxValue,
} from "./mailbox-crypto.ts";
import {
  newestMessagesPerSource,
  normalizeGmailMessage,
  normalizeOutlookMessage,
} from "./mailbox-message.ts";
import type {
  MailboxConnectionDocument,
  MailMessage,
} from "../types/mailbox.ts";

const connection = (source: "gmail" | "outlook"): MailboxConnectionDocument => ({
  _id: crypto.randomUUID(),
  userId: crypto.randomUUID(),
  source,
  providerAccountId: "account-id",
  address: `${source}@example.com`,
  credentials: "encrypted",
  createdAt: new Date(),
  updatedAt: new Date(),
});

test("mailbox secrets are authenticated and encrypted", () => {
  const previous = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-only-secret";
  try {
    const sealed = sealMailboxValue({ accessToken: "secret-token" }, "test");
    assert.deepEqual(openMailboxValue(sealed, "test"), {
      accessToken: "secret-token",
    });
    assert.throws(() => openMailboxValue(sealed, "other-context"));
    assert.throws(() => openMailboxValue(`${sealed.slice(0, -1)}x`, "test"));
  } finally {
    if (previous === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = previous;
  }
});

test("provider messages normalize and keep the newest 25 per source", () => {
  const gmail = normalizeGmailMessage(connection("gmail"), {
    id: "gmail-message",
    internalDate: "1000",
    snippet: "Preview",
    payload: { headers: [
      { name: "Subject", value: "Subject" },
      { name: "From", value: "Sender <sender@example.com>" },
    ] },
  });
  const outlook = normalizeOutlookMessage(connection("outlook"), {
    id: "outlook-message",
    subject: "",
    receivedDateTime: "2026-09-10T10:00:00Z",
    bodyPreview: "Preview",
    from: { emailAddress: { name: "Sender", address: "sender@example.com" } },
  });
  assert.equal(gmail?.subject, "Subject");
  assert.equal(outlook?.subject, "(No subject)");
  assert.equal(outlook?.sender, "Sender <sender@example.com>");

  const messages = Array.from({ length: 30 }, (_, index): MailMessage => ({
    ...gmail!,
    id: String(index),
    receivedAt: new Date(index * 1_000).toISOString(),
  }));
  assert.deepEqual(
    newestMessagesPerSource(messages).map(({ id }) => id),
    Array.from({ length: 25 }, (_, index) => String(29 - index)),
  );
});
