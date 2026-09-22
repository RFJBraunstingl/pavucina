import type { SettingsPatch } from "@/types/preferences/settings-sync.ts";

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
