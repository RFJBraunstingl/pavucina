import { addChildTask } from "./task-service.ts";
import type { Graph, TaskNode } from "@/types/graph";
import type { MailMessage } from "@/types/mailbox";
import type { ScheduleMode } from "@/types/preferences";

export function addInboxTask(graph: Graph, id: string, value: string) {
  const name = value.trim();
  if (
    !name ||
    graph.nodes.some((node) => node.id === id) ||
    graph.inboxNodes?.some((node) => node.id === id)
  ) {
    return graph;
  }
  const task: TaskNode = { id, type: "task", properties: { name } };
  return { ...graph, inboxNodes: [...(graph.inboxNodes ?? []), task] };
}

export function addMailboxInboxTask(
  graph: Graph,
  id: string,
  message: MailMessage,
) {
  const duplicate = [...graph.nodes, ...(graph.inboxNodes ?? [])].some(
    (node) =>
      node.type === "task" &&
      node.properties.mailOrigin?.connectionId === message.connectionId &&
      node.properties.mailOrigin.id === message.id,
  );
  if (duplicate) return graph;
  const task: TaskNode = {
    id,
    type: "task",
    properties: {
      name: message.subject.trim() || "(No subject)",
      description: [
        `From: ${message.sender}`,
        `Received: ${message.receivedAt}`,
        message.preview,
      ].filter(Boolean).join("\n\n"),
      mailOrigin: {
        connectionId: message.connectionId,
        source: message.source,
        id: message.id,
      },
    },
  };
  return { ...graph, inboxNodes: [...(graph.inboxNodes ?? []), task] };
}

export function renameInboxTask(graph: Graph, id: string, value: string) {
  const name = value.trim();
  const task = graph.inboxNodes?.find((node) => node.id === id);
  if (!name || !task || task.properties.name === name) return graph;
  return {
    ...graph,
    inboxNodes: (graph.inboxNodes ?? []).map((node) =>
      node.id === id
        ? { ...node, properties: { ...node.properties, name } }
        : node,
    ),
  };
}

export function deleteInboxTask(graph: Graph, id: string) {
  if (!graph.inboxNodes?.some((node) => node.id === id)) return graph;
  return {
    ...graph,
    inboxNodes: graph.inboxNodes.filter((node) => node.id !== id),
  };
}

export function moveInboxTask(
  graph: Graph,
  id: string,
  parentId: string,
  scheduleMode: ScheduleMode,
) {
  const task = graph.inboxNodes?.find((node) => node.id === id);
  if (!task) return graph;
  const withChild = addChildTask(graph, parentId, task.id, scheduleMode);
  if (withChild === graph) return graph;
  return {
    ...withChild,
    nodes: withChild.nodes.map((node) => node.id === task.id ? task : node),
    inboxNodes: graph.inboxNodes!.filter((node) => node.id !== id),
  };
}
