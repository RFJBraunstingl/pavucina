export type TaskNode = {
  id: string;
  type: "task";
  properties: { name: string };
};

export type DateNode = {
  id: string;
  type: "date";
  properties: { value: string };
};

export type GraphNode = TaskNode | DateNode;
export type DateRelationshipType = "plannedStartDate" | "plannedEndDate";
export type RelationshipType = "child" | DateRelationshipType;

export type Relationship = {
  id: string;
  type: RelationshipType;
  sourceId: string;
  targetId: string;
};

export type Graph = {
  version: 1;
  nodes: GraphNode[];
  relationships: Relationship[];
};

export type FlatTask = { task: TaskNode; depth: number };

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DATE_RELATIONSHIPS: DateRelationshipType[] = [
  "plannedStartDate",
  "plannedEndDate",
];

function asDay(value: string) {
  if (!DATE_PATTERN.test(value)) return Number.NaN;
  const [year, month, day] = value.split("-").map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  return new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp / DAY_MS
    : Number.NaN;
}

export function todayIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value: string, amount: number) {
  const day = asDay(value);
  if (!Number.isFinite(day)) throw new Error(`Invalid ISO date: ${value}`);
  return new Date((day + amount) * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string) {
  return asDay(end) - asDay(start);
}

export function makeDateRange(start: string, length = 28) {
  return Array.from({ length }, (_, index) => addDays(start, index));
}

function dateNode(value: string): DateNode {
  return {
    id: `date:${value}`,
    type: "date",
    properties: { value },
  };
}

// ponytail: linear graph scans are enough for local data; index nodes when real datasets make rendering slow.
export function getTaskDate(
  graph: Graph,
  taskId: string,
  type: DateRelationshipType,
) {
  const relationship = graph.relationships.find(
    (item) => item.sourceId === taskId && item.type === type,
  );
  const node = graph.nodes.find(
    (item): item is DateNode =>
      item.id === relationship?.targetId && item.type === "date",
  );
  return node?.properties.value;
}

function removeUnusedDates(graph: Graph): Graph {
  const usedDates = new Set(
    graph.relationships
      .filter((item) => DATE_RELATIONSHIPS.includes(item.type as DateRelationshipType))
      .map((item) => item.targetId),
  );
  return {
    ...graph,
    nodes: graph.nodes.filter(
      (node) => node.type !== "date" || usedDates.has(node.id),
    ),
  };
}

export function setTaskDate(
  graph: Graph,
  taskId: string,
  type: DateRelationshipType,
  value?: string,
) {
  if (value && !Number.isFinite(asDay(value))) {
    throw new Error(`Invalid ISO date: ${value}`);
  }

  let nodes = graph.nodes;
  const relationships = graph.relationships.filter(
    (item) => !(item.sourceId === taskId && item.type === type),
  );

  if (value) {
    const target = dateNode(value);
    if (!nodes.some((node) => node.id === target.id)) nodes = [...nodes, target];
    relationships.push({
      id: `${type}:${taskId}`,
      type,
      sourceId: taskId,
      targetId: target.id,
    });
  }

  return removeUnusedDates({ ...graph, nodes, relationships });
}

export function setTaskDates(
  graph: Graph,
  taskId: string,
  start: string,
  end: string,
) {
  if (daysBetween(start, end) < 0) throw new Error("Task end precedes start");
  return setTaskDate(
    setTaskDate(graph, taskId, "plannedStartDate", start),
    taskId,
    "plannedEndDate",
    end,
  );
}

export function moveTask(graph: Graph, taskId: string, amount: number) {
  const start = getTaskDate(graph, taskId, "plannedStartDate");
  const end = getTaskDate(graph, taskId, "plannedEndDate");
  return start && end
    ? setTaskDates(graph, taskId, addDays(start, amount), addDays(end, amount))
    : graph;
}

export function resizeTask(
  graph: Graph,
  taskId: string,
  edge: "start" | "end",
  amount: number,
) {
  const start = getTaskDate(graph, taskId, "plannedStartDate");
  const end = getTaskDate(graph, taskId, "plannedEndDate");
  if (!start || !end) return graph;

  if (edge === "start") {
    const nextStart = addDays(start, amount);
    return setTaskDates(graph, taskId, nextStart > end ? end : nextStart, end);
  }

  const nextEnd = addDays(end, amount);
  return setTaskDates(graph, taskId, start, nextEnd < start ? start : nextEnd);
}

export function flattenTasks(graph: Graph): FlatTask[] {
  const tasks = graph.nodes.filter((node): node is TaskNode => node.type === "task");
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
    for (const childId of children.get(id) ?? []) visit(childId, depth + 1);
  };

  for (const task of tasks) if (!childIds.has(task.id)) visit(task.id, 0);
  return result;
}

export function addChildTask(graph: Graph, parentId: string, childId: string) {
  const parent = graph.nodes.find(
    (node): node is TaskNode => node.id === parentId && node.type === "task",
  );
  if (!parent) return graph;

  let next: Graph = {
    ...graph,
    nodes: [
      ...graph.nodes,
      { id: childId, type: "task", properties: { name: "New task" } },
    ],
    relationships: [
      ...graph.relationships,
      {
        id: `child:${parentId}:${childId}`,
        type: "child",
        sourceId: parentId,
        targetId: childId,
      },
    ],
  };

  for (const type of DATE_RELATIONSHIPS) {
    const value = getTaskDate(graph, parentId, type);
    if (value) next = setTaskDate(next, childId, type, value);
  }
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isGraph(value: unknown): value is Graph {
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.relationships)
  ) {
    return false;
  }

  const nodes = new Map<string, GraphNode>();
  for (const rawNode of value.nodes) {
    if (!isRecord(rawNode) || typeof rawNode.id !== "string" || nodes.has(rawNode.id)) {
      return false;
    }
    if (!isRecord(rawNode.properties)) return false;

    if (
      rawNode.type === "task" &&
      typeof rawNode.properties.name === "string" &&
      rawNode.properties.name.trim()
    ) {
      nodes.set(rawNode.id, rawNode as TaskNode);
    } else if (
      rawNode.type === "date" &&
      typeof rawNode.properties.value === "string" &&
      Number.isFinite(asDay(rawNode.properties.value)) &&
      rawNode.id === `date:${rawNode.properties.value}`
    ) {
      nodes.set(rawNode.id, rawNode as DateNode);
    } else {
      return false;
    }
  }

  const relationshipIds = new Set<string>();
  const parents = new Map<string, string>();
  const dateRelationships = new Set<string>();
  const children = new Map<string, string[]>();

  for (const rawRelationship of value.relationships) {
    if (
      !isRecord(rawRelationship) ||
      typeof rawRelationship.id !== "string" ||
      relationshipIds.has(rawRelationship.id) ||
      typeof rawRelationship.sourceId !== "string" ||
      typeof rawRelationship.targetId !== "string" ||
      !["child", ...DATE_RELATIONSHIPS].includes(rawRelationship.type as RelationshipType)
    ) {
      return false;
    }

    const relationship = rawRelationship as Relationship;
    const source = nodes.get(relationship.sourceId);
    const target = nodes.get(relationship.targetId);
    if (!source || source.type !== "task" || !target) return false;

    if (relationship.type === "child") {
      if (target.type !== "task" || parents.has(target.id)) return false;
      parents.set(target.id, source.id);
      children.set(source.id, [...(children.get(source.id) ?? []), target.id]);
    } else {
      const key = `${source.id}:${relationship.type}`;
      if (target.type !== "date" || dateRelationships.has(key)) return false;
      dateRelationships.add(key);
    }

    relationshipIds.add(relationship.id);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    for (const child of children.get(id) ?? []) if (!visit(child)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  for (const node of nodes.values()) {
    if (node.type === "task" && !visit(node.id)) return false;
  }

  const graph = value as Graph;
  for (const node of nodes.values()) {
    if (node.type !== "task") continue;
    const start = getTaskDate(graph, node.id, "plannedStartDate");
    const end = getTaskDate(graph, node.id, "plannedEndDate");
    if (start && end && daysBetween(start, end) < 0) return false;
  }
  return true;
}

export function createSeedGraph(today: string): Graph {
  const taskData = [
    ["project", "Launch Pavucina"],
    ["research", "Research workflows"],
    ["design", "Design timeline"],
    ["prototype", "Build prototype"],
    ["frontend", "Timeline interactions"],
    ["graph", "Graph data model"],
    ["testing", "Test the experience"],
    ["release", "Release preview"],
  ] as const;
  const schedule = [
    ["project", -9, 12],
    ["research", -9, -5],
    ["design", -4, 1],
    ["prototype", -1, 8],
    ["frontend", 0, 5],
    ["graph", 1, 6],
    ["testing", 7, 10],
    ["release", 11, 12],
  ] as const;
  const childData = [
    ["project", "research"],
    ["project", "design"],
    ["project", "prototype"],
    ["prototype", "frontend"],
    ["prototype", "graph"],
    ["project", "testing"],
    ["project", "release"],
  ] as const;

  let graph: Graph = {
    version: 1,
    nodes: taskData.map(([id, name]) => ({
      id,
      type: "task",
      properties: { name },
    })),
    relationships: childData.map(([parentId, childId]) => ({
      id: `child:${parentId}:${childId}`,
      type: "child",
      sourceId: parentId,
      targetId: childId,
    })),
  };

  for (const [taskId, start, end] of schedule) {
    graph = setTaskDates(graph, taskId, addDays(today, start), addDays(today, end));
  }
  return graph;
}
