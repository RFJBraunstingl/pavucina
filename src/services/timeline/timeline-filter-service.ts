import { flattenTasks } from "@/services/task/core/task-tree-service.ts";
import type { Graph, TaskNode } from "@/types/graph/graph";
import type {
  TimelineFilterLevel,
  TimelineFilterOption,
  TimelineFilterResult,
} from "@/types/timeline/timeline-filter";

function taskTree(graph: Graph) {
  const tasks = new Map(
    graph.nodes.flatMap((node) => node.type === "task" ? [[node.id, node]] : []),
  );
  const children = new Map<string, string[]>();
  const parents = new Map<string, string>();
  for (const relationship of graph.relationships) {
    if (relationship.type !== "child" || !tasks.has(relationship.targetId)) continue;
    children.set(relationship.sourceId, [
      ...(children.get(relationship.sourceId) ?? []),
      relationship.targetId,
    ]);
    parents.set(relationship.targetId, relationship.sourceId);
  }
  const rootId = graph.nodes.find((node) => node.type === "root")?.id;
  const topLevelIds = rootId
    ? children.get(rootId) ?? []
    : [...tasks.keys()].filter((id) => !parents.has(id));
  return { tasks, children, parents, topLevelIds };
}

function taskOptions(
  ids: string[],
  tasks: ReadonlyMap<string, TaskNode>,
  parents: ReadonlyMap<string, string>,
  doneIds: ReadonlySet<string>,
  hideDone: boolean,
) {
  const seen = new Set<string>();
  return ids.flatMap((id): TimelineFilterOption[] => {
    const task = tasks.get(id);
    if (!task || seen.has(id) || (hideDone && doneIds.has(id))) return [];
    seen.add(id);
    return [{
      id,
      name: task.properties.name,
      parentName: tasks.get(parents.get(id) ?? "")?.properties.name,
    }];
  });
}

function filterLevels(
  graph: Graph,
  requested: readonly (readonly string[])[],
  hideDone: boolean,
) {
  const tree = taskTree(graph);
  const doneIds = new Set(graph.relationships.flatMap((relationship) =>
    relationship.type === "markedAsDone" ? [relationship.sourceId] : []));
  const levels: TimelineFilterLevel[] = [];
  let optionIds = tree.topLevelIds;

  for (let depth = 0; depth === 0 || optionIds.length; depth += 1) {
    const options = taskOptions(
      optionIds,
      tree.tasks,
      tree.parents,
      doneIds,
      hideDone,
    );
    if (depth > 0 && !options.length) break;
    const requestedIds = new Set(requested[depth] ?? []);
    const selectedIds = options.flatMap(({ id }) => requestedIds.has(id) ? [id] : []);
    levels.push({ depth, options, selectedIds });
    if (!selectedIds.length) break;
    optionIds = selectedIds.flatMap((id) => tree.children.get(id) ?? []);
  }
  return { tree, levels, doneIds };
}

export function getTimelineFilter(
  graph: Graph,
  requested: readonly (readonly string[])[],
  hideDone: boolean,
  collapsedIds: ReadonlySet<string>,
): TimelineFilterResult {
  const { tree, levels, doneIds } = filterLevels(graph, requested, hideDone);
  const selections = levels.flatMap(({ selectedIds }) =>
    selectedIds.length ? [selectedIds] : []);
  const deepestIds = selections.at(-1);
  const allowedTaskIds = deepestIds ? new Set<string>() : null;
  const expandedTaskIds = new Set<string>();

  if (allowedTaskIds && deepestIds) {
    const pending = [...deepestIds];
    while (pending.length) {
      const id = pending.pop()!;
      if (allowedTaskIds.has(id)) continue;
      allowedTaskIds.add(id);
      pending.push(...(tree.children.get(id) ?? []));
    }
    for (const id of deepestIds) {
      let parentId = tree.parents.get(id);
      while (parentId && tree.tasks.has(parentId)) {
        allowedTaskIds.add(parentId);
        expandedTaskIds.add(parentId);
        parentId = tree.parents.get(parentId);
      }
    }
  }

  const effectiveCollapsedIds = new Set(
    [...collapsedIds].filter((id) => !expandedTaskIds.has(id)),
  );
  const tasks = flattenTasks(graph, effectiveCollapsedIds).filter(({ task }) =>
    (!hideDone || !doneIds.has(task.id)) &&
    (!allowedTaskIds || allowedTaskIds.has(task.id)));

  return {
    levels,
    selections,
    tasks,
    allowedTaskIds,
    expandedTaskIds,
    active: Boolean(deepestIds),
  };
}
