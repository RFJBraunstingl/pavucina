import type { FlatTask } from "@/types/graph/graph";

export type TimelineFilterOption = {
  id: string;
  name: string;
  parentName?: string;
};

export type TimelineFilterLevel = {
  depth: number;
  options: TimelineFilterOption[];
  selectedIds: string[];
};

export type TimelineFilterResult = {
  levels: TimelineFilterLevel[];
  selections: string[][];
  tasks: FlatTask[];
  allowedTaskIds: ReadonlySet<string> | null;
  expandedTaskIds: ReadonlySet<string>;
  active: boolean;
};

export type TimelineFiltersProps = {
  levels: TimelineFilterLevel[];
  active: boolean;
  onChange: (depth: number, selectedIds: string[]) => void;
  onClear: () => void;
};

export type TimelineFilterFieldProps = {
  level: TimelineFilterLevel;
  onChange: (selectedIds: string[]) => void;
};
