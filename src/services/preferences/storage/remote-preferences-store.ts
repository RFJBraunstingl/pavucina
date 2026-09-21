import { parseUserPreferences } from "../preferences-service.ts";
import { diffPreferences } from "../settings-patch-service.ts";
import { GraphConflictError } from "@/services/graph/sync/graph-patch-service.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";

export async function loadRemotePreferences() {
  const response = await fetch("/api/preferences", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load your preferences");
  const preferences = parseUserPreferences(await response.json());
  if (!preferences) throw new Error("The saved preferences are invalid");
  return preferences;
}
export async function saveRemotePreferences(preferences: UserPreferences, before?: UserPreferences) {
  const response = await fetch("/api/preferences", {
    method: before ? "PATCH" : "PUT",
    headers: { "content-type": "application/json", ...(!before && { "x-pavucina-restore": "true" }) },
    body: JSON.stringify(before ? diffPreferences(before, preferences) : preferences),
  });
  if (response.ok) return;
  const body = await response.json().catch(() => ({}));
  if (response.status === 409) throw new GraphConflictError(body.conflicts ?? []);
  throw new Error(body.error ?? "Could not save your preferences");
}

export async function sendPreferencePatch(patch: import("@/types/preferences/settings-sync.ts").SettingsPatch) {
  const response = await fetch("/api/preferences", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) });
  if (response.ok) return;
  const body = await response.json().catch(() => ({}));
  if (response.status === 409) throw new GraphConflictError(body.conflicts ?? []);
  throw new Error(body.error ?? "Could not save preferences");
}
export async function pullPreferenceChanges(after: number) {
  const response = await fetch(`/api/preferences?after=${after}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load preference changes");
  return response.json() as Promise<{ revision: number; fields: Record<string, { after?: unknown }> }>;
}
