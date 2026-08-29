import { setTaskDates } from "../services/task-service.ts";
import { addDays } from "../utils/date.ts";
import type { Graph } from "@/types/graph";

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
