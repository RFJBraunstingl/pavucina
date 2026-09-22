import { GraphConflictError } from "@/services/graph/sync/graph-conflict-error.ts";
import { changedFields, equalValue } from "@/utils/shared/field-changes.ts";
import { isUserPreferences } from "../preferences-service.ts";
import type { SyncConflict } from "@/types/graph/graph-sync.ts";
import type { UserPreferences } from "@/types/preferences/preferences.ts";
import type { SettingsPatch } from "@/types/preferences/settings-sync.ts";

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

export function applyPreferencePatches(
  current: UserPreferences,
  patches: SettingsPatch[],
  force = false,
) {
  return patches.reduce(
    (preferences, patch) => applyPreferencesPatch(preferences, patch, force),
    current,
  );
}

export function withoutConflictingPreferenceFields(
  patches: SettingsPatch[],
  conflicts: SyncConflict[],
) {
  const conflictingFields = new Set(conflicts.map(({ field }) => field));
  return patches
    .map((patch) => ({
      ...patch,
      fields: Object.fromEntries(
        Object.entries(patch.fields).filter(
          ([field]) => !conflictingFields.has(field),
        ),
      ),
    }))
    .filter(hasPreferenceChanges);
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
      next[key] = change.after;
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
