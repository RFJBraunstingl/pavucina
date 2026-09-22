import { GraphConflictError } from "@/services/graph/sync/graph-patch-service.ts";
import { changedFields, equalValue } from "@/utils/shared/field-changes.ts";
import { isUserPreferences } from "./preferences-service.ts";
import type { SyncConflict } from "@/types/graph/graph-sync.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";
import type { SettingsPatch } from "@/types/preferences/settings-sync.ts";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function diffPreferences(
  before: UserPreferences,
  after: UserPreferences,
): SettingsPatch {
  const fields = changedFields({ ...before }, { ...after });
  delete fields.collapsedTaskIds;
  return {
    fields,
    collapsed: {
      add: after.collapsedTaskIds.filter(
        (id) => !before.collapsedTaskIds.includes(id),
      ),
      remove: before.collapsedTaskIds.filter(
        (id) => !after.collapsedTaskIds.includes(id),
      ),
    },
  };
}

export function hasPreferenceChanges(patch: SettingsPatch) {
  return Object.keys(patch.fields).length > 0 ||
    Boolean(patch.collapsed?.add.length) ||
    Boolean(patch.collapsed?.remove.length);
}

export function withoutConflictingPreferenceFields(
  patches: SettingsPatch[],
  conflicts: SyncConflict[],
) {
  const conflictingFields = new Set(conflicts.map(({ field }) => field));
  return patches.map((patch) => ({
    ...patch,
    fields: Object.fromEntries(
      Object.entries(patch.fields).filter(
        ([field]) => !conflictingFields.has(field),
      ),
    ),
  }));
}

export function applyPreferencesPatch(
  current: UserPreferences,
  patch: SettingsPatch,
  force = false,
) {
  const next = { ...current } as Record<string, unknown>;
  const conflicts: SyncConflict[] = [];

  for (const [key, change] of Object.entries(patch.fields)) {
    const savedChanged = !equalValue(next[key], change.before);
    const alreadyApplied = equalValue(next[key], change.after);
    if (!force && savedChanged && !alreadyApplied) {
      conflicts.push({
        id: "preferences",
        field: key,
        mine: change.after,
        saved: next[key],
      });
    } else if (change.after === undefined) {
      delete next[key];
    } else {
      Object.defineProperty(next, key, {
        value: change.after,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
  if (conflicts.length) throw new GraphConflictError(conflicts);

  const collapsedTaskIds = new Set(next.collapsedTaskIds as string[]);
  for (const id of patch.collapsed?.remove ?? []) collapsedTaskIds.delete(id);
  for (const id of patch.collapsed?.add ?? []) collapsedTaskIds.add(id);
  next.collapsedTaskIds = [...collapsedTaskIds];

  if (!isUserPreferences(next)) throw new Error("Invalid preference changes");
  return next;
}

function isFieldChange(value: unknown) {
  return object(value) &&
    Object.keys(value).every((key) => key === "before" || key === "after");
}

function isCollapsedTaskChanges(value: unknown) {
  return value === undefined ||
    (object(value) &&
      Array.isArray(value.add) &&
      Array.isArray(value.remove) &&
      [...value.add, ...value.remove].every((id) => typeof id === "string"));
}

export function isSettingsPatch(value: unknown): value is SettingsPatch {
  return object(value) &&
    object(value.fields) &&
    Object.entries(value.fields).every(([key, change]) =>
      /^[a-zA-Z]+$/.test(key) && isFieldChange(change),
    ) &&
    isCollapsedTaskChanges(value.collapsed);
}
