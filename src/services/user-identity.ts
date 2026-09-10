import "server-only";

import { getMongoDatabase } from "./mongodb";
import type {
  AuthProvider,
  UserIdentityDocument,
} from "@/types/user-storage";

let indexPromise: Promise<string> | undefined;

function authProvider(provider: string): AuthProvider {
  if (provider === "github" || provider === "google") return provider;
  throw new Error("Unsupported authentication provider");
}

export async function resolveUserId(
  provider: string,
  providerAccountId: string,
) {
  if (!providerAccountId) throw new Error("Missing provider account ID");
  const resolvedProvider = authProvider(provider);
  const users = (await getMongoDatabase()).collection<UserIdentityDocument>(
    "users",
  );
  indexPromise ??= users
    .createIndex(
      { provider: 1, providerAccountId: 1 },
      { unique: true },
    )
    .catch((error) => {
      indexPromise = undefined;
      throw error;
    });
  await indexPromise;
  const identity = { provider: resolvedProvider, providerAccountId };
  const user = await users.findOneAndUpdate(
    identity,
    { $setOnInsert: { _id: crypto.randomUUID(), ...identity } },
    { upsert: true, returnDocument: "after" },
  );
  if (!user) throw new Error("Could not resolve user identity");
  return user._id;
}
