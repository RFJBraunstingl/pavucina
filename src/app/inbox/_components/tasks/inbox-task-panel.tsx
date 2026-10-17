import { useMemo } from "react";

import TimelineGrid from "@/app/_components/timeline/grid/timeline-grid";
import { isNodeDone } from "@/services/event/completion-service";
import {
  addChildTask,
  addTopLevelTask,
  flattenTasks,
  getParentTaskIds,
  renameTask,
} from "@/services/task/core/task-service";
import type { InboxTaskPanelProps } from "@/types/inbox/inbox-components";

export default function InboxTaskPanel(props: InboxTaskPanelProps) {
  const graph = props.graph;
  const tasks = useMemo(
    () => graph ? flattenTasks(graph, props.collapsedIds).filter(
      ({ task }) => !props.hideDone || !isNodeDone(graph, task.id),
    ) : [],
    [props.collapsedIds, graph, props.hideDone],
  );

  function addChild(parentId: string) {
    if (!graph) {
      console.warn("Expected a loaded graph; creating a child task was cancelled.");
      return;
    }
    const id = crypto.randomUUID();
    props.onGraphChange(
      addChildTask(graph, parentId, id, props.scheduleMode),
    );
    props.onSelect(id);
  }

  function addTopLevel() {
    if (!graph) {
      console.warn("Expected a loaded graph; creating a task was cancelled.");
      return;
    }
    const id = crypto.randomUUID();
    props.onGraphChange(addTopLevelTask(graph, id));
    props.onSelect(id);
  }

  return (
    <section
      className="inbox-panel inbox-task-panel"
      aria-labelledby="inbox-timeline-heading"
    >
      <header className="inbox-panel-heading task-panel-heading">
        <div>
          <p className="eyebrow">Knowledge graph</p>
          <h2 id="inbox-timeline-heading">Timeline</h2>
        </div>
        <label className="done-toggle">
          <input
            type="checkbox"
            checked={props.hideDone}
            disabled={props.disabled}
            onChange={(event) => props.onHideDoneChange(event.target.checked)}
          />
          Hide done
        </label>
        <div className="tree-actions" aria-label="Task hierarchy">
          <button
            type="button"
            disabled={props.disabled}
            onClick={() =>
              graph && props.onCollapsedIdsChange(getParentTaskIds(graph))
            }
          >
            Collapse all
          </button>
          <button
            type="button"
            disabled={props.disabled}
            onClick={() => props.onCollapsedIdsChange(new Set())}
          >
            Expand all
          </button>
        </div>
      </header>
      <div className="inbox-task-tree">
        {graph && !props.disabled && <TimelineGrid
          graph={graph}
          scheduleMode={props.scheduleMode}
          days={[]}
          today={props.today}
          rangeStart={props.today}
          selectedId={props.selectedId}
          tasks={tasks}
          taskColumnWidth={320}
          collapsedIds={props.collapsedIds}
          externalDropTargetId={props.dropTargetId}
          onGraphChange={props.onGraphChange}
          onCollapsedIdsChange={props.onCollapsedIdsChange}
          onTaskColumnWidthChange={() => undefined}
          onSelect={props.onSelect}
          onNameChange={(id, name) =>
            props.onGraphChange(renameTask(graph, id, name))
          }
          onAddChild={addChild}
          onCreate={addTopLevel}
        />}
      </div>
    </section>
  );
}
