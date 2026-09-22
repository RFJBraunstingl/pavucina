import type { FlatTask, Graph, RootNode } from "@/types/graph/graph";

export function taskTree(graph: Graph) {
  const tasks = new Map(
    graph.nodes.flatMap((node) =>
      node.type === "task" ? [[node.id, node] as const] : [],
    ),
  );
  const children = new Map<string, string[]>();
  const parents = new Map<string, string>();
  for (const relationship of graph.relationships) {
    if (relationship.type !== "child" || !tasks.has(relationship.targetId)) {
      continue;
    }
    const childIds = children.get(relationship.sourceId) ?? [];
    childIds.push(relationship.targetId);
    children.set(relationship.sourceId, childIds);
    parents.set(relationship.targetId, relationship.sourceId);
  }
  const rootId = graph.nodes.find((node) => node.type === "root")?.id;
  const topLevelIds = rootId
    ? children.get(rootId) ?? []
    : [...tasks.keys()].filter((id) => !parents.has(id));
  return { tasks, children, parents, rootId, topLevelIds };
}

export function ensureRootNode(graph: Graph): Graph {
  const root = graph.nodes.find(
    (node): node is RootNode => node.type === "root",
  );
  const tree = taskTree(graph);
  const topLevelTasks = [...tree.tasks.values()].filter(
    (task) => !tree.parents.has(task.id),
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
  const tree = taskTree(graph);
  const result: FlatTask[] = [];
  const visit = (id: string, depth: number) => {
    const task = tree.tasks.get(id);
    if (!task) return;
    result.push({ task, depth });
    if (collapsedIds?.has(id)) return;
    for (const childId of tree.children.get(id) ?? []) {
      visit(childId, depth + 1);
    }
  };
  for (const taskId of tree.topLevelIds) visit(taskId, 0);
  return result;
}

export function getParentTaskIds(graph: Graph) {
  const tree = taskTree(graph);
  return new Set(
    [...tree.parents.values()].filter((parentId) => parentId !== tree.rootId),
  );
}

export function getTaskAndDescendantIds(graph: Graph, taskId: string) {
  const tree = taskTree(graph);
  if (!tree.tasks.has(taskId)) return new Set<string>();

  const result = new Set<string>();
  const pending = [taskId];
  while (pending.length) {
    const id = pending.pop()!;
    if (result.has(id)) continue;
    result.add(id);
    pending.push(...(tree.children.get(id) ?? []));
  }
  return result;
}

export function getParentTaskNames(graph: Graph, taskId: string) {
  const tree = taskTree(graph);
  const names: string[] = [];
  let parent = tree.tasks.get(tree.parents.get(taskId) ?? "");
  while (parent) {
    names.unshift(parent.properties.name);
    parent = tree.tasks.get(tree.parents.get(parent.id) ?? "");
  }
  return names;
}
