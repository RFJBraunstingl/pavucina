import "server-only";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import type {
  MailboxConnectionDocument,
  MailboxSource,
} from "@/types/mailbox/mailbox";

let indexesPromise: Promise<unknown> | undefined;

async function mailboxes() {
  const collection = (await getMongoDatabase()).collection<MailboxConnectionDocument>(
    "mailboxes",
  );
  indexesPromise ??= Promise.all([
    collection.createIndex(
      { userId: 1, source: 1, providerAccountId: 1 },
      { unique: true },
    ),
    collection.createIndex({ userId: 1, source: 1 }),
  ]).catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  await indexesPromise;
  return collection;
}

export async function listMailboxConnections(userId: string) {
  return (await mailboxes())
    .find({ userId })
    .sort({ source: 1, address: 1 })
    .toArray();
}

export async function findMailboxConnection(
  userId: string,
  connectionId: string,
) {
  return (await mailboxes()).findOne({ _id: connectionId, userId });
}

export async function findMailboxConnectionByAccount(
  userId: string,
  source: MailboxSource,
  providerAccountId: string,
) {
  return (await mailboxes()).findOne({ userId, source, providerAccountId });
}

export async function saveMailboxConnection(
  userId: string,
  source: MailboxSource,
  providerAccountId: string,
  address: string,
  credentials: string,
) {
  const now = new Date();
  return (await mailboxes()).findOneAndUpdate(
    { userId, source, providerAccountId },
    {
      $set: { address, credentials, updatedAt: now },
      $setOnInsert: { _id: crypto.randomUUID(), createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );
}

export async function updateMailboxCredentials(
  connection: MailboxConnectionDocument,
  encryptedCredentials: string,
) {
  await (await mailboxes()).updateOne(
    { _id: connection._id, userId: connection.userId },
    { $set: { credentials: encryptedCredentials, updatedAt: new Date() } },
  );
}

export async function deleteMailboxConnection(
  userId: string,
  connectionId: string,
) {
  return (await mailboxes()).deleteOne({ _id: connectionId, userId });
}
