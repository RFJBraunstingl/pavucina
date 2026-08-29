"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { loadGraph, saveGraph } from "@/services/graph-store";
import { todayIso } from "@/utils/date";
import type { Graph } from "@/types/graph";

const subscribe = () => () => {};

export function useGraph() {
  const [today] = useState(todayIso);
  const [graph, setGraph] = useState<Graph | null>(() => loadGraph(today));
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    if (hydrated && graph) saveGraph(graph);
  }, [graph, hydrated]);

  return { graph, setGraph, today, hydrated };
}
