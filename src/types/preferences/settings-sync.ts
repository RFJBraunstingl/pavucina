import type { FieldChange } from "@/types/graph/graph-sync";

export type SettingsPatch = {
  fields: Record<string, FieldChange>;
  collapsed?: {
    add: string[];
    remove: string[];
  };
};
