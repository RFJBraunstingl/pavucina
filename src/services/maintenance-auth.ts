import { createHash, timingSafeEqual } from "node:crypto";

export type MaintenanceAuthorization =
  | "authorized"
  | "unauthorized"
  | "unconfigured";

const digest = (value: string) => createHash("sha256").update(value).digest();

export function authorizeMaintenance(
  authorization: string | null,
  secret = process.env.MAINTENANCE_SECRET,
): MaintenanceAuthorization {
  if (!secret) return "unconfigured";
  const supplied = authorization?.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  return supplied && timingSafeEqual(digest(supplied), digest(secret))
    ? "authorized"
    : "unauthorized";
}
