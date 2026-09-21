import "server-only";

import { getMongoDatabase } from "@/services/infrastructure/mongodb";
import { isAuthProvider } from "@/utils/account/auth-provider";
import { isUuid } from "@/utils/shared/id";
import type {
  AuthProvider,
  UserIdentityDocument,
} from "@/types/account/user-storage";

let indexesPromise: Promise<unknown> | undefined;

function authProvider(provider: string): AuthProvider {
  if (isAuthProvider(provider)) return provider;
  throw new Error("Unsupported authentication provider");
}

async function identities() {
  const collection = (await getMongoDatabase()).collection<UserIdentityDocument>(
    "users",
  );
  indexesPromise ??= Promise.all([
    collection.createIndex(
      { provider: 1, providerAccountId: 1 },
      { unique: true },
    ),
    collection.createIndex({ userId: 1 }),
  ]).catch((error) => {
    indexesPromise = undefined;
    throw error;
  });
  await indexesPromise;
  return collection;
}

export async function resolveUserId(
  provider: string,
  providerAccountId: string,
  userIdOnCreate?: string,
) {
  if (!providerAccountId) throw new Error("Missing provider account ID");
  if (userIdOnCreate && !isUuid(userIdOnCreate)) {
    throw new Error("Invalid internal user ID");
  }
  const resolvedProvider = authProvider(provider);
  const users = await identities();
  const identity = { provider: resolvedProvider, providerAccountId };
  const identityId = crypto.randomUUID();
  const user = await users.findOneAndUpdate(
    identity,
    {
      $setOnInsert: {
        _id: identityId,
        userId: userIdOnCreate ?? identityId,
        ...identity,
      },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!user) throw new Error("Could not resolve user identity");
  if (!user.userId) {
    await users.updateOne({ _id: user._id }, { $set: { userId: user._id } });
  }
  return user.userId ?? user._id;
}

export async function resolveCanonicalUserId(userId: string) {
  if (!isUuid(userId)) throw new Error("Invalid internal user ID");
  const identity = await (await identities()).findOne({ _id: userId });
  return identity?.userId ?? userId;
}

export async function listLinkedProviders(userId: string) {
  const linked = await (await identities())
    .find({
      $or: [
        { userId },
        { _id: userId, userId: { $exists: false } },
      ],
    })
    .sort({ provider: 1, providerAccountId: 1 })
    .toArray();
  return linked.map(({ provider }) => provider);
}

export async function remapUserIdentities(
  targetUserId: string,
  sourceUserId: string,
) {
  await (await identities()).updateMany(
    {
      $or: [
        { userId: targetUserId },
        { _id: targetUserId, userId: { $exists: false } },
      ],
    },
    { $set: { userId: sourceUserId } },
  );
}
