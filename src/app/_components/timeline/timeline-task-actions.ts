import {
  addChildTask,
  addTopLevelTask,
  renameTask,
} from "@/services/task/core/task-service";
import type { TimelineTaskActionsOptions } from "@/types/timeline/timeline-interaction";

export function createTimelineTaskActions({
  scheduleMode,
  onGraphChange,
  onSelect,
}: TimelineTaskActionsOptions) {
  function rename(taskId: string, name: string) {
    onGraphChange((graph) =>
      graph ? renameTask(graph, taskId, name) : graph,
    );
  }

  function addChild(parentId: string) {
    const childId = crypto.randomUUID();
    onGraphChange((graph) =>
      graph ? addChildTask(graph, parentId, childId, scheduleMode) : graph,
    );
    onSelect(childId);
  }

  function addTopLevel() {
    const taskId = crypto.randomUUID();
    onGraphChange((graph) =>
      graph ? addTopLevelTask(graph, taskId) : graph,
    );
    onSelect(taskId);
  }

  return { rename, addChild, addTopLevel };
}
