import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
} from "node:crypto";

import type { OAuthCredentials } from "@/types/auth/oauth";

function encryptionKey(context: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured");
  return createHmac("sha256", secret).update(context).digest();
}

export function sealOAuthValue(value: unknown, context: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(context), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function openOAuthValue(value: string, context: string): unknown {
  const parts = value.split(".").map((part) => Buffer.from(part, "base64url"));
  if (parts.length !== 3 || parts[0].length !== 12 || parts[1].length !== 16) {
    throw new Error("Invalid encrypted OAuth data");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(context),
    parts[0],
  );
  decipher.setAuthTag(parts[1]);
  const decrypted = Buffer.concat([
    decipher.update(parts[2]),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

export function openOAuthCredentials(value: string, context: string) {
  const credentials = openOAuthValue(value, context) as Record<string, unknown>;
  if (
    typeof credentials.accessToken !== "string" ||
    (credentials.refreshToken !== undefined &&
      typeof credentials.refreshToken !== "string") ||
    (credentials.expiresAt !== undefined &&
      typeof credentials.expiresAt !== "number")
  ) {
    throw new Error("Stored OAuth credentials are invalid");
  }
  return credentials as OAuthCredentials;
}
