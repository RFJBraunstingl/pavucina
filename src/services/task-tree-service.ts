import type { FlatTask, Graph, TaskNode } from "@/types/graph";

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

export function getParentTaskNames(graph: Graph, taskId: string) {
  // ponytail: rebuild maps per call; cache paths if large ToDo lists make this measurable.
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
