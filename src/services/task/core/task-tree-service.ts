import type { FlatTask, Graph, RootNode, TaskNode } from "@/types/graph/graph";

export function ensureRootNode(graph: Graph): Graph {
  const root = graph.nodes.find(
    (node): node is RootNode => node.type === "root",
  );
  const parentedTaskIds = new Set(
    graph.relationships
      .filter((relationship) => relationship.type === "child")
      .map((relationship) => relationship.targetId),
  );
  const topLevelTasks = graph.nodes.filter(
    (node): node is TaskNode =>
      node.type === "task" && !parentedTaskIds.has(node.id),
  );
  if (root && !topLevelTasks.length) return graph;

  const nextRoot = root ?? {
    id: crypto.randomUUID(),
    type: "root",
    properties: {},
  } satisfies RootNode;
  return {
    ...graph,
    nodes: root ? graph.nodes : [nextRoot, ...graph.nodes],
    relationships: [
      ...graph.relationships,
      ...topLevelTasks.map((task) => ({
        id: crypto.randomUUID(),
        type: "child" as const,
        sourceId: nextRoot.id,
        targetId: task.id,
      })),
    ],
  };
}

export function flattenTasks(
  graph: Graph,
  collapsedIds?: ReadonlySet<string>,
): FlatTask[] {
  const tasks = graph.nodes.filter(
    (node): node is TaskNode => node.type === "task",
  );
  const children = new Map<string, string[]>();
  const childIds = new Set<string>();
  for (const relationship of graph.relationships) {
    if (relationship.type !== "child") continue;
    children.set(relationship.sourceId, [
      ...(children.get(relationship.sourceId) ?? []),
      relationship.targetId,
    ]);
    childIds.add(relationship.targetId);
  }

  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const result: FlatTask[] = [];
  const visit = (id: string, depth: number) => {
    const task = taskById.get(id);
    if (!task) return;
    result.push({ task, depth });
    if (collapsedIds?.has(id)) return;
    for (const childId of children.get(id) ?? []) visit(childId, depth + 1);
  };
  const root = graph.nodes.find((node) => node.type === "root");
  const topLevelIds = root
    ? children.get(root.id) ?? []
    : tasks.filter((task) => !childIds.has(task.id)).map((task) => task.id);
  for (const taskId of topLevelIds) visit(taskId, 0);
  return result;
}

export function getParentTaskIds(graph: Graph) {
  const rootId = graph.nodes.find((node) => node.type === "root")?.id;
  return new Set(
    graph.relationships
      .filter(({ type, sourceId }) => type === "child" && sourceId !== rootId)
      .map(({ sourceId }) => sourceId),
  );
}

export function getTaskAndDescendantIds(graph: Graph, taskId: string) {
  const taskIds = new Set(
    graph.nodes.flatMap((node) => node.type === "task" ? [node.id] : []),
  );
  if (!taskIds.has(taskId)) return new Set<string>();

  const result = new Set<string>();
  const pending = [taskId];
  while (pending.length) {
    const id = pending.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    for (const relationship of graph.relationships) {
      if (
        relationship.type === "child" &&
        relationship.sourceId === id &&
        taskIds.has(relationship.targetId)
      ) {
        pending.push(relationship.targetId);
      }
    }
  }
  return result;
}

export function getParentTaskNames(graph: Graph, taskId: string) {
  const tasks = new Map(
    graph.nodes.flatMap((node) => node.type === "task" ? [[node.id, node]] : []),
  );
  const parents = new Map(
    graph.relationships.flatMap((relationship) =>
      relationship.type === "child"
        ? [[relationship.targetId, relationship.sourceId]]
        : [],
    ),
  );
  const names: string[] = [];
  let parent = tasks.get(parents.get(taskId) ?? "");
  while (parent) {
    names.unshift(parent.properties.name);
    parent = tasks.get(parents.get(parent.id) ?? "");
  }
  return names;
}
