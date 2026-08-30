import "server-only";

import { MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  pavucinaMongoClient?: Promise<MongoClient>;
};

export async function getMongoDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");

  globalForMongo.pavucinaMongoClient ??= new MongoClient(uri).connect().catch((error) => {
    globalForMongo.pavucinaMongoClient = undefined;
    throw error;
  });
  return (await globalForMongo.pavucinaMongoClient).db();
}
