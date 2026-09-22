import { useGraph } from "@/providers/graph-provider";
import {
  addInboxTask,
  addMailboxInboxTask,
  deleteInboxTask,
  moveInboxTask,
  renameInboxTask,
  setInboxTaskDescription,
} from "@/services/inbox/inbox-service";
import type { MailMessage } from "@/types/mailbox/mailbox";
import type { InboxActionsOptions } from "@/types/inbox/inbox-components";

export function useInboxActions({
  preferences,
  scheduleMode,
  patchPreferences,
  onSelect,
}: InboxActionsOptions) {
  const { graph, setGraph } = useGraph();

  function addMessage(message: MailMessage) {
    setGraph((current) =>
      current
        ? addMailboxInboxTask(current, crypto.randomUUID(), message)
        : current,
    );
  }

  function createTask(name: string) {
    setGraph((current) =>
      current
        ? addInboxTask(current, crypto.randomUUID(), name)
        : current,
    );
  }

  function renameTask(taskId: string, name: string) {
    setGraph((current) =>
      current ? renameInboxTask(current, taskId, name) : current,
    );
  }

  function updateDescription(taskId: string, description: string) {
    setGraph((current) =>
      current
        ? setInboxTaskDescription(current, taskId, description)
        : current,
    );
  }

  function deleteTask(taskId: string) {
    setGraph((current) =>
      current ? deleteInboxTask(current, taskId) : current,
    );
  }

  function moveTask(taskId: string, parentId: string) {
    if (!graph || !preferences) return;
    const next = moveInboxTask(graph, taskId, parentId, scheduleMode);
    if (next === graph) return;
    setGraph(next);
    patchPreferences({
      collapsedTaskIds: preferences.collapsedTaskIds.filter(
        (id) => id !== parentId,
      ),
    });
    onSelect(taskId);
  }

  return {
    addMessage,
    createTask,
    renameTask,
    updateDescription,
    deleteTask,
    moveTask,
  };
}
