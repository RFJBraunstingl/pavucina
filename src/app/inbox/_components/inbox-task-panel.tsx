import { useMemo } from "react";

import TimelineGrid from "../../_components/timeline-grid";
import { isTaskDone } from "@/services/task-completion-service";
import {
  addChildTask,
  addTopLevelTask,
  flattenTasks,
  getParentTaskIds,
  renameTask,
} from "@/services/task-service";
import type { Graph } from "@/types/graph";
import type { ScheduleMode } from "@/types/preferences";

type Props = {
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

export default function InboxTaskPanel(props: Props) {
  const tasks = useMemo(
    () => flattenTasks(props.graph, props.collapsedIds).filter(
      ({ task }) => !props.hideDone || !isTaskDone(props.graph, task.id),
    ),
    [props.collapsedIds, props.graph, props.hideDone],
  );

  function addChild(parentId: string) {
    const id = crypto.randomUUID();
    props.onGraphChange(
      addChildTask(props.graph, parentId, id, props.scheduleMode),
    );
    props.onSelect(id);
  }

  function addTopLevel() {
    const id = crypto.randomUUID();
    props.onGraphChange(addTopLevelTask(props.graph, id));
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
            onChange={(event) => props.onHideDoneChange(event.target.checked)}
          />
          Hide done
        </label>
        <div className="tree-actions" aria-label="Task hierarchy">
          <button
            type="button"
            onClick={() =>
              props.onCollapsedIdsChange(getParentTaskIds(props.graph))
            }
          >
            Collapse all
          </button>
          <button
            type="button"
            onClick={() => props.onCollapsedIdsChange(new Set())}
          >
            Expand all
          </button>
        </div>
      </header>
      <div className="inbox-task-tree">
        <TimelineGrid
          graph={props.graph}
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
            props.onGraphChange(renameTask(props.graph, id, name))
          }
          onAddChild={addChild}
          onCreate={addTopLevel}
        />
      </div>
    </section>
  );
}
