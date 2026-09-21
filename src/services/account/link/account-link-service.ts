import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import {
  remapUserIdentities,
  resolveUserId,
} from "../auth/user-identity";
import { accountLinkOutcome } from "@/utils/account/account-link";
import type {
  AccountLinkRequestDocument,
  AuthProvider,
} from "@/types/account/user-storage";

export const ACCOUNT_LINK_COOKIE = "pavucina.account-link";
export const ACCOUNT_LINK_MAX_AGE = 10 * 60;

let indexPromise: Promise<string> | undefined;

function tokenId(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function requests() {
  const collection = (await getMongoDatabase()).collection<AccountLinkRequestDocument>(
    "account_link_requests",
  );
  indexPromise ??= collection
    .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
    .catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  await indexPromise;
  return collection;
}

async function deleteWorkspace(userId: string) {
  const database = await getMongoDatabase();
  await Promise.all([
    database.collection("calendar_connections").deleteMany({ userId }),
    database.collection("edges").deleteMany({ userId }),
    database.collection("graph_records").deleteMany({ userId }),
    database.collection("graph_current").deleteMany({ userId }),
    database.collection("graph_commits").deleteMany({ userId }),
    database.collection("mailboxes").deleteMany({ userId }),
    database.collection("nodes").deleteMany({ userId }),
    database.collection("settings").deleteMany({ userId }),
  ]);
}

export async function createAccountLinkRequest(
  sourceUserId: string,
  provider: AuthProvider,
) {
  const token = randomBytes(32).toString("base64url");
  await (await requests()).insertOne({
    _id: tokenId(token),
    sourceUserId,
    provider,
    state: "pending",
    expiresAt: new Date(Date.now() + ACCOUNT_LINK_MAX_AGE * 1_000),
  });
  return token;
}

export async function loadAccountLinkRequest(
  token: string,
  sourceUserId?: string,
) {
  return (await requests()).findOne({
    _id: tokenId(token),
    ...(sourceUserId && { sourceUserId }),
    expiresAt: { $gt: new Date() },
  });
}

export async function resolveAccountLink(
  token: string,
  provider: AuthProvider,
  providerAccountId: string,
) {
  const collection = await requests();
  const request = await loadAccountLinkRequest(token);
  if (!request || request.provider !== provider) return null;
  if (request.state !== "pending") return request.sourceUserId;

  const targetUserId = await resolveUserId(
    provider,
    providerAccountId,
    request.sourceUserId,
  );
  const outcome = accountLinkOutcome(request.sourceUserId, targetUserId);
  await collection.updateOne(
    { _id: request._id, state: "pending" },
    { $set: outcome },
  );
  return request.sourceUserId;
}

export async function confirmAccountLink(token: string, sourceUserId: string) {
  const collection = await requests();
  const request = await loadAccountLinkRequest(token, sourceUserId);
  if (request?.state !== "conflict" || !request.targetUserId) return false;

  await remapUserIdentities(request.targetUserId, sourceUserId);
  await deleteWorkspace(request.targetUserId);
  await collection.updateOne(
    { _id: request._id, state: "conflict" },
    { $set: { state: "complete" }, $unset: { targetUserId: "" } },
  );
  return true;
}

export async function cancelAccountLinkRequest(
  token: string,
  sourceUserId: string,
) {
  await (await requests()).deleteOne({
    _id: tokenId(token),
    sourceUserId,
  });
}
