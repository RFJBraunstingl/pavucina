"use client";

import { useMemo, useState } from "react";

import AppHeader from "@/app/_components/common/app-header";
import { GraphLoading, GraphSyncError } from "@/app/_components/sync/graph-state";
import { usePreferences } from "@/app/_components/sync/use-preferences";
import InboxTaskPanel from "./tasks/inbox-task-panel";
import MoveTaskDialog from "./tasks/move-task-dialog";
import ScratchpadPanel from "./tasks/scratchpad-panel";
import SourcePanel from "./mailbox/source-panel";
import { useInboxActions } from "./tasks/use-inbox-actions";
import { useInboxDrag } from "./tasks/use-inbox-drag";
import { useGraph } from "@/providers/graph-provider";
import { resolvedScheduleMode } from "@/services/preferences/preferences-service";
import { flattenTasks, getParentTaskNames } from "@/services/task/core/task-service";

export default function InboxView() {
  const {
    graph,
    setGraph,
    today,
    hydrated,
    syncError,
    retry,
  } = useGraph();
  const {
    preferences,
    setPreferences,
    syncError: preferencesError,
    retry: retryPreferences,
  } = usePreferences();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null);
  const collapsedIds = useMemo(
    () => new Set(preferences?.collapsedTaskIds),
    [preferences?.collapsedTaskIds],
  );
  const parentOptions = useMemo(
    () =>
      graph
        ? flattenTasks(graph).map(({ task }) => ({
            id: task.id,
            label: [
              ...getParentTaskNames(graph, task.id),
              task.properties.name,
            ].join(" › "),
          }))
        : [],
    [graph],
  );
  const scheduleMode = preferences ? resolvedScheduleMode(preferences) : "leaf";
  const actions = useInboxActions({
    preferences,
    scheduleMode,
    setPreferences,
    onSelect: setSelectedId,
  });
  const drag = useInboxDrag(actions.moveTask);

  if (!hydrated || !graph) {
    return (
      <GraphLoading
        label="Loading inbox…"
        error={syncError}
        onRetry={retry}
      />
    );
  }
  if (!preferences) {
    return (
      <GraphLoading
        label="Loading preferences…"
        error={preferencesError}
        onRetry={retryPreferences}
      />
    );
  }

  return (
    <main className="app-shell">
      <AppHeader active="inbox" title="Inbox" />
      <GraphSyncError error={syncError} onRetry={retry} />
      <GraphSyncError error={preferencesError} onRetry={retryPreferences} />
      <div className="inbox-workspace">
        <SourcePanel onAdd={actions.addMessage} />
        <ScratchpadPanel
          nodes={graph.inboxNodes ?? []}
          draggingId={drag.draggingId}
          onCreate={actions.createTask}
          onRename={actions.renameTask}
          onDescriptionChange={actions.updateDescription}
          onDelete={actions.deleteTask}
          onMoveRequest={setMoveTaskId}
          onDragStart={drag.begin}
          onDragMove={drag.move}
          onDragEnd={drag.end}
          onDragCancel={drag.cancel}
        />
        <InboxTaskPanel
          graph={graph}
          scheduleMode={scheduleMode}
          today={today}
          selectedId={selectedId}
          hideDone={preferences.hideDone}
          collapsedIds={collapsedIds}
          dropTargetId={drag.targetId}
          onGraphChange={setGraph}
          onCollapsedIdsChange={(ids) =>
            setPreferences({ ...preferences, collapsedTaskIds: [...ids] })
          }
          onHideDoneChange={(hideDone) =>
            setPreferences({ ...preferences, hideDone })
          }
          onSelect={setSelectedId}
        />
      </div>
      <MoveTaskDialog
        taskId={moveTaskId}
        parents={parentOptions}
        onMove={actions.moveTask}
        onClose={() => setMoveTaskId(null)}
      />
    </main>
  );
}
