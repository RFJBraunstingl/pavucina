import type { Graph, TaskNode } from "@/types/graph/graph";
import type { EventNode } from "@/types/calendar/events/event";

export type TodoItem = TaskNode | EventNode;

export type TodoDetailsDialogProps = {
  graph: Graph;
  item: TodoItem | null;
  onClose: () => void;
};

export type TodoListItemProps = {
  graph: Graph;
  item: TodoItem;
  showFullTaskPath: boolean;
  onDetails: (id: string) => void;
  onCompletion: (itemId: string, done: boolean) => void;
};

export type TodoHeaderProps = {
  date: string;
  doneCount: number;
  itemCount: number;
  hideDone: boolean;
  showFullTaskPath: boolean;
  onHideDoneChange: (hideDone: boolean) => void;
  onShowFullTaskPathChange: (showFullTaskPath: boolean) => void;
};
