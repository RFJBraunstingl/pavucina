import { changedFields, equalValue } from "@/utils/shared/field-changes.ts";
import { GraphConflictError } from "@/services/graph/sync/graph-patch-service.ts";
import { isUserPreferences } from "./preferences-service.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";
import type { SettingsPatch } from "@/types/preferences/settings-sync.ts";

export function diffPreferences(before: UserPreferences, after: UserPreferences): SettingsPatch {
  const fields = changedFields({ ...before }, { ...after });
  delete fields.collapsedTaskIds;
  return { fields, collapsed: { add: after.collapsedTaskIds.filter((id) => !before.collapsedTaskIds.includes(id)),
    remove: before.collapsedTaskIds.filter((id) => !after.collapsedTaskIds.includes(id)) } };
}
export function applyPreferencesPatch(current: UserPreferences, patch: SettingsPatch, force = false) {
  const next = { ...current } as Record<string, unknown>;
  const conflicts = [];
  for (const [key, change] of Object.entries(patch.fields)) {
    if (!force && !equalValue(next[key], change.before) && !equalValue(next[key], change.after)) {
      conflicts.push({ id: "preferences", field: key, mine: change.after, saved: next[key] });
    } else if (change.after === undefined) delete next[key];
    else Object.defineProperty(next, key, { value: change.after, enumerable: true, writable: true, configurable: true });
  }
  if (conflicts.length) throw new GraphConflictError(conflicts);
  const collapsed = new Set(next.collapsedTaskIds as string[]);
  for (const id of patch.collapsed?.remove ?? []) collapsed.delete(id);
  for (const id of patch.collapsed?.add ?? []) collapsed.add(id);
  next.collapsedTaskIds = [...collapsed];
  if (!isUserPreferences(next)) throw new Error("Invalid preference changes");
  return next;
}
export function isSettingsPatch(value: unknown): value is SettingsPatch {
  if (!value || typeof value !== "object") return false;
  const patch = value as SettingsPatch;
  if (!patch.fields || typeof patch.fields !== "object" || Array.isArray(patch.fields)) return false;
  if (!Object.entries(patch.fields).every(([key, value]) => /^[a-zA-Z]+$/.test(key) && value && typeof value === "object" &&
    Object.keys(value).every((key) => key === "before" || key === "after"))) return false;
  return patch.collapsed === undefined || Boolean(patch.collapsed && Array.isArray(patch.collapsed.add) && Array.isArray(patch.collapsed.remove) &&
    [...patch.collapsed.add, ...patch.collapsed.remove].every((id) => typeof id === "string"));
}
