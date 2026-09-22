import { GraphConflictError } from "@/services/graph/sync/graph-conflict-error.ts";
import { parseUserPreferences } from "../preferences-service.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";
import type { PreferenceChanges } from "@/types/preferences/preferences-sync.ts";
import type { SettingsPatch } from "@/types/preferences/settings-sync.ts";

async function requireSaved(response: Response, fallbackMessage: string) {
  if (response.ok) return;
  const body = await response.json().catch(() => ({}));
  if (response.status === 409) {
    throw new GraphConflictError(body.conflicts ?? []);
  }
  throw new Error(body.error ?? fallbackMessage);
}

export async function loadRemotePreferences() {
  const response = await fetch("/api/preferences", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load your preferences");
  const preferences = parseUserPreferences(await response.json());
  if (!preferences) throw new Error("The saved preferences are invalid");
  return preferences;
}

export async function restoreRemotePreferences(preferences: UserPreferences) {
  const response = await fetch("/api/preferences", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-pavucina-restore": "true",
    },
    body: JSON.stringify(preferences),
  });
  await requireSaved(response, "Could not restore your preferences");
}

export async function sendPreferencePatch(patch: SettingsPatch) {
  const response = await fetch("/api/preferences", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(patch),
  });
  await requireSaved(response, "Could not save preferences");
}

export async function pullPreferenceChanges(after: number) {
  const response = await fetch(`/api/preferences?after=${after}`, {
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Could not load preference changes");
  return response.json() as Promise<PreferenceChanges>;
}
