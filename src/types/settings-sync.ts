import type { FieldChange } from "./graph-sync";
export type SettingsPatch = { fields: Record<string, FieldChange>; collapsed?: { add: string[]; remove: string[] } };
