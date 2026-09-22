import type { FlatTask, Graph } from "@/types/graph/graph";
import type { ScheduleMode } from "@/types/preferences/preferences";
import type { TaskColumnResizeControls } from "./timeline-interaction";

export type TimelineGridProps = {
  graph: Graph;
  scheduleMode: ScheduleMode;
  days: string[];
  today: string;
  rangeStart: string;
  selectedId: string | null;
  tasks: FlatTask[];
  filterExpandedIds?: ReadonlySet<string>;
  filterActive?: boolean;
  taskColumnWidth: number;
  collapsedIds: ReadonlySet<string>;
  externalDropTargetId?: string | null;
  onGraphChange: (graph: Graph) => void;
  onCollapsedIdsChange: (ids: Set<string>) => void;
  onTaskColumnWidthChange: (width: number) => void;
  onSelect: (taskId: string) => void;
  onNameChange: (taskId: string, value: string) => void;
  onAddChild: (parentId: string) => void;
  onCreate: () => void;
};

export type TimelineGridHeaderProps = Pick<
  TimelineGridProps,
  "days" | "today"
> & { taskColumn: TaskColumnResizeControls };

export type TimelineNewTaskRowProps = Pick<
  TimelineGridProps,
  "days" | "today" | "onCreate"
>;

export type TimelineToolbarProps = {
  days: string[];
  hideDone: boolean;
  onHideDoneChange: (hideDone: boolean) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onPrevious: () => void;
  onToday: () => void;
  onNext: () => void;
};
