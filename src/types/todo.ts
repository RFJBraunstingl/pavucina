import type { Graph, TaskNode } from "./graph";

export type TodoTaskDetailsDialogProps = {
  graph: Graph;
  task: TaskNode | null;
  onClose: () => void;
};
