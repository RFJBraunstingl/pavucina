import {
  setTaskDates,
  setTaskTimes,
} from "../services/task-schedule-service.ts";
import { ensureRootNode } from "../services/graph-service.ts";
import { addDays } from "../utils/date.ts";
import type { Graph } from "@/types/graph";

export function createSeedGraph(today: string): Graph {
  const taskData = [
    ["project", "Launch Pavucina", "08:30", "09:30"],
    ["research", "Research workflows", "10:00", "11:30"],
    ["design", "Design timeline", "13:00", "14:30"],
    ["prototype", "Build prototype", "09:00", "10:30"],
    ["frontend", "Timeline interactions", "11:00", "12:00"],
    ["graph", "Graph data model", "14:00", "15:30"],
    ["testing", "Test the experience", "10:30", "12:00"],
    ["release", "Release preview", "15:00", "16:00"],
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
  const taskIds = new Map(taskData.map(([key]) => [key, crypto.randomUUID()]));

  let graph: Graph = {
    version: 1,
    nodes: taskData.map(([key, name, plannedStartTime, plannedEndTime]) => ({
      id: taskIds.get(key)!,
      type: "task",
      properties: { name, plannedStartTime, plannedEndTime },
    })),
    relationships: childData.map(([parentId, childId]) => ({
      id: crypto.randomUUID(),
      type: "child",
      sourceId: taskIds.get(parentId)!,
      targetId: taskIds.get(childId)!,
    })),
  };

  for (const [taskKey, start, end] of schedule) {
    graph = setTaskDates(
      graph,
      taskIds.get(taskKey)!,
      addDays(today, start),
      addDays(today, end),
    );
  }
  for (const [taskKey, , start, end] of taskData) {
    graph = setTaskTimes(graph, taskIds.get(taskKey)!, start, end);
  }
  return ensureRootNode(graph);
}
