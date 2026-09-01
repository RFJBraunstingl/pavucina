import { isUserPreferences } from "./preferences-service.ts";
import type { UserPreferences } from "@/types/preferences";

export async function loadRemotePreferences() {
  const response = await fetch("/api/preferences", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load your preferences");

  const value: unknown = await response.json();
  if (!isUserPreferences(value)) throw new Error("The saved preferences are invalid");
  return value;
}

export async function saveRemotePreferences(preferences: UserPreferences) {
  const response = await fetch("/api/preferences", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(preferences),
  });
  if (!response.ok) throw new Error("Could not save your preferences");
}
