import type { PointerEvent } from "react";

import type { Graph, TaskNode } from "@/types/graph/graph";
import type {
  MailboxConnectionSummary,
  MailMessage,
  MailboxSource,
} from "@/types/mailbox/mailbox";
import type {
  ScheduleMode,
  UserPreferences,
} from "@/types/preferences/preferences";

export type SourcePanelProps = {
  onAdd: (message: MailMessage) => void;
};

export type DisconnectMailboxDialogProps = {
  connection: MailboxConnectionSummary | null;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export type MailMessageListProps = {
  messages: MailMessage[];
  loading: boolean;
  busy: string | null;
  onAdd: (message: MailMessage) => void;
  onIgnore: (message: MailMessage) => void;
};

export type MailboxConnectionPickerProps = {
  connections: MailboxConnectionSummary[] | null;
  available?: Record<MailboxSource, boolean>;
  busy: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
  onConnect: (source: MailboxSource) => void;
};

export type InboxTaskPanelProps = {
  graph: Graph;
  scheduleMode: ScheduleMode;
  today: string;
  selectedId: string | null;
  hideDone: boolean;
  collapsedIds: ReadonlySet<string>;
  dropTargetId: string | null;
  onGraphChange: (graph: Graph) => void;
  onCollapsedIdsChange: (ids: Set<string>) => void;
  onHideDoneChange: (hideDone: boolean) => void;
  onSelect: (id: string) => void;
};

export type ParentOption = { id: string; label: string };

export type MoveTaskDialogProps = {
  taskId: string | null;
  parents: ParentOption[];
  onMove: (taskId: string, parentId: string) => void;
  onClose: () => void;
};

export type ScratchpadPanelProps = {
  nodes: TaskNode[];
  draggingId: string | null;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDescriptionChange: (id: string, description: string) => void;
  onDelete: (id: string) => void;
  onMoveRequest: (id: string) => void;
  onDragStart: (event: PointerEvent<HTMLButtonElement>, id: string) => void;
  onDragMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragEnd: (event: PointerEvent<HTMLButtonElement>) => void;
  onDragCancel: (event: PointerEvent<HTMLButtonElement>) => void;
};

export type InboxActionsOptions = {
  preferences: UserPreferences | null;
  scheduleMode: ScheduleMode;
  patchPreferences: (changes: Partial<UserPreferences>) => void;
  onSelect: (taskId: string) => void;
};

export type InboxDragState = {
  pointerId: number;
  taskId: string;
  originX: number;
  originY: number;
  started: boolean;
};
